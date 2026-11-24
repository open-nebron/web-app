# Nebron Web Frontend (Foundation)

The foundational web frontend application for the **Nebron** ecosystem, built on Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui primitives, and TanStack Query v5.

This application provides secure session authentication via httpOnly cookie rotation, in-memory access token storage, protected layout gating, user profile view & edit (including presigned direct R2/S3 avatar and banner uploads), and user settings.

---

## Prerequisites

- **Node.js**: v20 or later (v24 supported)
- **Backend Services**: Ensure all 4 microservices and backing databases are running via Docker Compose:
  ```bash
  cd ../infra
  make up-all
  ```
  This starts:
  - `auth-service` on port `4001`
  - `core-backend` (`core-api`) on port `4002`
  - `chat-service` on port `4003`
  - `voice-service` on port `4004`
  - MinIO / S3 on port `9000`

---

## Local Development Setup

From the `web/` directory:

```bash
# 1. Copy environment configuration
cp .env.example .env.local

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You will be automatically directed to `/login` if you are not currently signed in.

---

## Architecture & Authentication Flow

### 1. In-Memory Token & httpOnly Cookie Rotation
- **Access Tokens**: Short-lived JWT access tokens (RS256) are stored **strictly in memory** within the client's Zustand store (`lib/auth-store.ts`). They are never persisted to `localStorage` or `sessionStorage` to mitigate XSS exposure.
- **Refresh Tokens**: Opaque refresh tokens are stored in secure, `httpOnly`, `SameSite=Lax` cookies named `refresh_token`.
- **Silent Refresh & Deduplication**: If an API request receives an HTTP 401 response, `lib/api.ts` intercepts the error and executes `POST /api/auth-cookie/refresh/cookie`. All concurrent requests coalesce on a single in-flight refresh promise, preventing refresh token reuse collisions.
- **App Boot Initialization**: On initial application load, the app invokes `authApi.refresh()`. If a valid `refresh_token` cookie is present, a new access token is issued and user identity is restored before pages render.

### 2. Next.js Dev Proxy (Rewrites)
To eliminate CORS preflight latency and cookie SameSite issues in local development, `next.config.mjs` configures reverse-proxy rewrites:
- `/api/auth/*` → `http://localhost:4001/auth/*`
- `/api/auth-cookie/*` → `http://localhost:4001/auth/*`
- `/api/core/*` → `http://localhost:4002/*`
- `/api/chat/*` → `http://localhost:4003/*`
- `/api/voice/*` → `http://localhost:4004/*`

All browser calls stay same-origin (`localhost:3000`), allowing credentials and cookies to flow naturally.

### 3. Production Deployment
In production, frontend and microservices are typically routed behind a unified reverse proxy (such as Cloudflare, NGINX, or Kubernetes Ingress) sharing a common domain or subdomain. The client uses environment variables (`NEXT_PUBLIC_*_URL`) or ingress rules matching `/api/*`.

---

## Media Upload Flow (Direct-to-Storage)

Avatar ($\le 5$ MB) and banner ($\le 10$ MB) uploads use a direct presigned POST workflow to offload file transfer from microservices:
1. Client calls `POST /api/core/me/{avatar|banner}/upload-url` with `{ contentType, contentLength }`.
2. `core-api` validates size and MIME type, generating an S3/R2 presigned upload policy.
3. Client issues a `multipart/form-data` POST directly to MinIO/R2 using the presigned URL and form fields.
4. Client calls `POST /api/core/me/{avatar|banner}/confirm` with `{ objectKey }`. `core-api` verifies the uploaded asset using `HeadObject`, updates the user's document in MongoDB, and triggers cleanup of legacy objects.

---

## Manual Verification Checklist

Follow this checklist to verify full functionality:

- [x] **1. Register new user**: Navigate to `/register`, enter valid email and 12+ character password. Form automatically signs in and redirects to `/profile`.
- [x] **2. Log out**: Click the user dropdown in the bottom of the sidebar or settings page, click "Log out". Redirects to `/login` and clears active state.
- [x] **3. Log in**: Enter credentials at `/login`. Redirects to `/profile` with accurate user profile data.
- [x] **4. Refresh page (F5)**: Press F5 on `/profile`. The app stays authenticated via silent cookie refresh without flicker.
- [x] **5. Reopen session**: Close the browser tab/window and reopen `http://localhost:3000`. Still authenticated.
- [x] **6. Edit profile**: Navigate to `/profile/edit`. Update display name, bio, and about. Save button enables on change and updates data upon submit.
- [x] **7. Upload avatar**: Click "Upload Avatar" in `/profile/edit`. Select image ($\le 5$ MB). Image immediately previews and confirms in storage.
- [x] **8. Upload banner**: Click "Upload Banner" in `/profile/edit`. Select image ($\le 10$ MB). Banner appears in header and persists on refresh.
- [x] **9. Change theme**: In `/settings`, toggle between Light, Dark, and System. Theme applies instantly and persists across page reloads.
- [x] **10. Change language**: In `/settings`, select a new language from the dropdown. Preference persists across reloads.
- [x] **11. Access `/profile` when logged out**: Open incognito or clear cookies and go to `/profile`. Middleware and client guard redirect to `/login`.
- [x] **12. Access `/login` when logged in**: While logged in, go to `/login`. Middleware redirects to `/`.

---

## Public Profiles `/[username]`

- Public profiles at `/[username]` render read-only profiles without requiring authentication.
- Full public profile queries via `GET /users/:username` will be wired in core-backend in phase 7a (posts phase). For now, non-existent profiles render a friendly "Profile not found" screen.

---

## Voice Calls (WebRTC via LiveKit)

Nebron features browser-to-browser voice calling powered by LiveKit SFU and real-time WebSocket signaling via `chat-service` and `voice-service`.

### What's Supported
- **1:1 Real-time Audio Calls**: High-fidelity, low-latency Opus WebRTC audio channels.
- **Global Ingress & Overlay**: Calls can be initiated or received from any view across the platform.
- **Web Audio Ringtone**: Synthesized ringing tones with background tab notification support.
- **Controls & Quality**: Microphone mute/unmute, speaker mute (deafen), call duration tracking, and LiveKit connection quality indicator.
- **Resilience & Recovery**: Automatic token refresh on network drops, peer disconnect banners, and crash/refresh recovery (re-joining active calls on page reload).
- **Call History**: Dedicated `/calls` route to review past call status, duration, and timestamps.

### Known Limitations (Planned for v2)
- Video calls (v2)
- Group calls (v2)
- Screen sharing (v2)
- Call recording (v2)
- Voicemail & call transfer (v2)
- Push notifications via notifications-service (v2)

### 8-Item Manual Test Checklist

- [ ] **1. Initiate call**: User A clicks the Phone button in a 1:1 conversation header with User B. User A enters the outgoing call screen within 500ms. User B receives the incoming call modal and ringtone within 2s.
- [ ] **2. Accept call**: User B clicks Accept. Both users transition into the active call screen and audio flows bidirectionally.
- [ ] **3. Mic mute**: User A clicks the Mic button. User B hears silence. Unmuting restores voice transmission immediately.
- [ ] **4. Speaker mute**: User B clicks the Speaker button (deafen). Remote incoming audio is muted locally without affecting the microphone.
- [ ] **5. Duration tracking**: The timer increments every second from connection time and displays `m:ss`.
- [ ] **6. Clean hangup**: Clicking the red End Call button hangs up via `voice-service`, disconnects the LiveKit room, and returns both users to their previous screen.
- [ ] **7. Page refresh recovery**: Refreshing the browser tab (F5) during an active call restores the call session within 3 seconds using `GET /api/voice/calls/active` and token refresh.
- [ ] **8. Network drop & reconnect**: Briefly toggling offline in DevTools triggers the reconnecting banner and LiveKit automatically re-establishes the audio stream upon reconnection.

### Audio Troubleshooting
- **No Sound / Mic Access Denied**: Ensure microphone permissions are granted in browser settings (`chrome://settings/content/microphone`).
- **Cannot Reach LiveKit**: Verify `LIVEKIT_PUBLIC_URL=ws://localhost:7880` is configured in `infra/.env` and `voice-service/.env.example`.
- **Echo / Feedback**: Use headphones or verify system echo cancellation when testing two tabs on the same machine.


---

## What's Coming Next

- **Phase 5b**: Real-time Chat UI, conversation lists, WebSocket channels, message history with ScyllaDB, typing indicators, and presence.
- **Phase 5c**: WebRTC Voice UI, LiveKit room integrations, microphone controls, active speaker detection, and audio visualizers.
