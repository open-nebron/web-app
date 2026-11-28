import { useAuthStore } from './auth-store';
import { resetUser } from './analytics';
import type {
  AuthUser,
  CheckUsernameResponse,
  ConfirmUploadResponse,
  LoginResponse,
  MetaResponse,
  PresignedUploadSlot,
  RefreshResponse,
  RegisterResponse,
  SessionsResponse,
  UserProfile,
  UserPrivacy,
} from './types';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface FetchOptions extends RequestInit {
  _retry?: boolean;
}

let refreshPromise: Promise<RefreshResponse> | null = null;

function decodeBase64Url(segment: string): string | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    if (typeof atob === 'function') {
      return atob(padded);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(padded, 'base64').toString('utf8');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts a JWT's expiration timestamp in epoch milliseconds, or null if invalid/missing.
 */
export function parseJwtExpiryMs(token: string | null | undefined): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;
  try {
    const payload = JSON.parse(decoded) as { exp?: unknown };
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null;
  } catch {
    return null;
  }
}

/**
 * Returns true if the token has a parseable `exp` within `bufferSeconds` of expiring.
 */
export function isTokenExpiringSoon(
  token: string | null | undefined,
  bufferSeconds: number = 15,
  nowMs: number = Date.now()
): boolean {
  const expMs = parseJwtExpiryMs(token);
  if (expMs === null) return false;
  return expMs - nowMs <= bufferSeconds * 1000;
}

/**
 * Computes delay (in ms) before scheduled proactive token refresh ahead of expiry.
 */
export function getProactiveRefreshDelayMs(
  token: string | null | undefined,
  bufferSeconds: number = 60,
  nowMs: number = Date.now()
): number | null {
  const expMs = parseJwtExpiryMs(token);
  if (expMs === null) return null;
  return Math.max(5_000, expMs - nowMs - bufferSeconds * 1000);
}

function isAuthLifecyclePath(path: string): boolean {
  return (
    path.includes('/refresh/cookie') ||
    path.includes('/login/cookie') ||
    path.includes('/logout/cookie') ||
    path.includes('/auth-cookie/register')
  );
}

async function handleRefreshFailure(refreshErr: unknown): Promise<never> {
  const errStatus = (refreshErr as { status?: number })?.status;
  if (errStatus === 0 || errStatus === 429 || (typeof errStatus === 'number' && errStatus >= 500)) {
    throw refreshErr;
  }

  useAuthStore.getState().clear();
  if (
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/login') &&
    !window.location.pathname.startsWith('/register')
  ) {
    window.location.href = '/login';
  }
  throw new ApiError(401, 'Session expired. Please log in again.');
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { headers: customHeaders, _retry, ...restOptions } = options;
  let token = useAuthStore.getState().accessToken;

  if (token && !_retry && !isAuthLifecyclePath(path) && isTokenExpiringSoon(token, 15)) {
    try {
      await authApi.refresh();
      token = useAuthStore.getState().accessToken;
    } catch (refreshErr) {
      await handleRefreshFailure(refreshErr);
    }
  }

  const headers = new Headers(customHeaders);
  if (restOptions.body && !headers.has('Content-Type') && !(restOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...restOptions,
      headers,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach server. Please check your connection.');
  }

  // Handle 401 Unauthorized with token refresh
  if (response.status === 401 && !_retry && !path.includes('/refresh/cookie') && !path.includes('/login/cookie')) {
    try {
      await authApi.refresh();

      // Retry original request with new access token
      return await apiFetch<T>(path, {
        ...options,
        _retry: true,
      });
    } catch (refreshErr) {
      await handleRefreshFailure(refreshErr);
    }
  }

  if (!response.ok) {
    let errorData: unknown = null;
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const json = await response.json();
      errorData = json;
      if (json && typeof json === 'object') {
        const errObj = json as {
          error?: { message?: string; code?: string; reason?: string };
          message?: string;
        };
        errorMessage = errObj.error?.message || errObj.message || errorMessage;

        if (errObj.error?.code === 'account_banned') {
          useAuthStore.getState().setBanned({
            isBanned: true,
            reason: errObj.error.reason || null,
          });
        }
      }
    } catch {
      // Body not JSON
    }

    throw new ApiError(response.status, errorMessage, errorData);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await apiFetch<LoginResponse>('/api/auth-cookie/login/cookie', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    useAuthStore.getState().setAccessToken(data.accessToken);

    try {
      const meData = await authApi.me();
      useAuthStore.getState().setUser({ userId: meData.userId, email: meData.email });
      useAuthStore.getState().setStatus('authenticated');
    } catch {
      // If /me fails, still authenticated if token present
      useAuthStore.getState().setStatus('authenticated');
    }

    return data;
  },

  async register(email: string, password: string): Promise<RegisterResponse> {
    return apiFetch<RegisterResponse>('/api/auth-cookie/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<void>('/api/auth-cookie/logout/cookie', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      resetUser();
      useAuthStore.getState().clear();
    }
  },

  async refresh(): Promise<RefreshResponse> {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      try {
        const data = await apiFetch<RefreshResponse>('/api/auth-cookie/refresh/cookie', {
          method: 'POST',
          credentials: 'include',
        });

        useAuthStore.getState().setAccessToken(data.accessToken);
        return data;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  },

  async me(): Promise<AuthUser> {
    return apiFetch<AuthUser>('/api/auth-cookie/me', {
      method: 'GET',
    });
  },

  async getSessions(): Promise<SessionsResponse> {
    return apiFetch<SessionsResponse>('/api/auth-cookie/sessions', {
      method: 'GET',
      credentials: 'include',
    });
  },

  async revokeSession(sessionId: string): Promise<void> {
    return apiFetch<void>(`/api/auth-cookie/sessions/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  },

  async revokeOtherSessions(): Promise<void> {
    return apiFetch<void>('/api/auth-cookie/sessions', {
      method: 'DELETE',
      credentials: 'include',
    });
  },
};

export const coreApi = {
  async getProfile(): Promise<UserProfile> {
    return apiFetch<UserProfile>('/api/core/me');
  },

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    return apiFetch<UserProfile>('/api/core/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async getPrivacy(): Promise<UserPrivacy> {
    return apiFetch<UserPrivacy>('/api/core/me/privacy');
  },

  async updatePrivacy(patch: Partial<UserPrivacy>): Promise<UserPrivacy> {
    return apiFetch<UserPrivacy>('/api/core/me/privacy', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async checkUsername(username: string): Promise<CheckUsernameResponse> {
    return apiFetch<CheckUsernameResponse>(
      `/api/core/username/check?username=${encodeURIComponent(username)}`
    );
  },

  async updateUsername(username: string): Promise<{ username: string }> {
    return apiFetch<{ username: string }>('/api/core/me/username', {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    });
  },

  async getMeta(): Promise<MetaResponse> {
    return apiFetch<MetaResponse>('/api/core/meta');
  },

  // Avatar upload flow
  async requestAvatarUpload(contentType: string, contentLength: number): Promise<PresignedUploadSlot> {
    return apiFetch<PresignedUploadSlot>('/api/core/me/avatar/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentLength }),
    });
  },

  async confirmAvatar(objectKey: string): Promise<ConfirmUploadResponse> {
    return apiFetch<ConfirmUploadResponse>('/api/core/me/avatar/confirm', {
      method: 'POST',
      body: JSON.stringify({ objectKey }),
    });
  },

  async deleteAvatar(): Promise<void> {
    return apiFetch<void>('/api/core/me/avatar', {
      method: 'DELETE',
    });
  },

  // Banner upload flow
  async requestBannerUpload(contentType: string, contentLength: number): Promise<PresignedUploadSlot> {
    return apiFetch<PresignedUploadSlot>('/api/core/me/banner/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentLength }),
    });
  },

  async confirmBanner(objectKey: string): Promise<ConfirmUploadResponse> {
    return apiFetch<ConfirmUploadResponse>('/api/core/me/banner/confirm', {
      method: 'POST',
      body: JSON.stringify({ objectKey }),
    });
  },

  async deleteBanner(): Promise<void> {
    return apiFetch<void>('/api/core/me/banner', {
      method: 'DELETE',
    });
  },

  // Public profile
  async getPublicProfile(username: string): Promise<UserProfile | null> {
    try {
      return await apiFetch<UserProfile>(`/api/core/users/by-username/${encodeURIComponent(username)}`);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        return null;
      }
      throw err;
    }
  },

  async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      return await apiFetch<UserProfile>(`/api/core/users/${encodeURIComponent(userId)}`);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        return null;
      }
      throw err;
    }
  },
};

