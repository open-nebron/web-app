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

  it('proactively refreshes expiring JWT access token before sending API requests', async () => {
    const expiredExp = Math.floor(Date.now() / 1000) - 5;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'user-1', exp: expiredExp })).toString('base64url');
    const expiringJwt = `${header}.${payload}.sig`;

    const freshExp = Math.floor(Date.now() / 1000) + 900;
    const freshPayload = Buffer.from(JSON.stringify({ sub: 'user-1', exp: freshExp })).toString('base64url');
    const freshJwt = `${header}.${freshPayload}.sig`;

    useAuthStore.setState({ accessToken: expiringJwt });

    const refreshSpy = vi.spyOn(authApi, 'refresh').mockImplementation(async () => {
      useAuthStore.getState().setAccessToken(freshJwt);
      return { accessToken: freshJwt, expiresIn: 900 };
    });

    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    global.fetch = fetchMock as typeof fetch;

    await apiFetch('/api/chat/conversations/requests');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const reqHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(reqHeaders.get('Authorization')).toBe(`Bearer ${freshJwt}`);
  });
});
