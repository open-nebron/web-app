import posthog from 'posthog-js';

let initialized = false;

export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (initialized) return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return;

  posthog.init(apiKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    person_profiles: 'always',
    capture_pageview: true,
  });
  initialized = true;
}

export function identifyUser(userId: string, email?: string): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.identify(userId, email ? { email } : undefined);
  } catch {
    // Non-blocking
  }
}

export function resetUser(): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.reset();
  } catch {
    // Non-blocking
  }
}

export function captureAnalytics(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Non-blocking
  }
}
