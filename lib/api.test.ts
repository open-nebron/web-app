import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, authApi, ApiError } from './api';
import { useAuthStore } from './auth-store';

describe('apiFetch token refresh error handling', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    useAuthStore.setState({
      accessToken: 'initial-token',
      user: { userId: 'user-1', email: 'alice@example.com' },
      status: 'authenticated',
      bannedState: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('preserves authenticated session when silent refresh is rate-limited (429)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Expired' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    vi.spyOn(authApi, 'refresh').mockRejectedValueOnce(new ApiError(429, 'Too many requests'));

    await expect(apiFetch('/api/core/me')).rejects.toMatchObject({ status: 429 });
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().accessToken).toBe('initial-token');
  });

  it('clears authenticated session when silent refresh returns 401', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Expired' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    ) as typeof fetch;

    vi.spyOn(authApi, 'refresh').mockRejectedValueOnce(new ApiError(401, 'Invalid refresh token'));

    await expect(apiFetch('/api/core/me')).rejects.toMatchObject({ status: 401 });
    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
