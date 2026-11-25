import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from './api';
import * as analyticsModule from './analytics';

describe('Auth Sessions & Analytics API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getSessions calls GET /api/auth-cookie/sessions with credentials include', async () => {
    const mockSessionsResponse = {
      sessions: [
        {
          sessionId: 'sess-1',
          userAgent: { browser: 'Chrome', os: 'Linux', deviceType: 'desktop' },
          ip: '127.0.0.1',
          lastActiveAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isCurrent: true,
          isActive: true,
        },
      ],
    };

    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSessionsResponse,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const res = await authApi.getSessions();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth-cookie/sessions',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      })
    );
    expect(res).toEqual(mockSessionsResponse);
  });

  it('revokeSession calls DELETE /api/auth-cookie/sessions/:id with credentials include', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
    });
    vi.stubGlobal('fetch', fetchSpy);

    await authApi.revokeSession('target-sess-123');
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth-cookie/sessions/target-sess-123',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
      })
    );
  });

  it('revokeOtherSessions calls DELETE /api/auth-cookie/sessions with credentials include', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
    });
    vi.stubGlobal('fetch', fetchSpy);

    await authApi.revokeOtherSessions();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/auth-cookie/sessions',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
      })
    );
  });

  it('logout invokes resetUser on analytics and clears session', async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchSpy);
    const resetSpy = vi.spyOn(analyticsModule, 'resetUser');

    await authApi.logout();
    expect(resetSpy).toHaveBeenCalled();
  });

  it('analytics functions execute safely without crashing when no API key is configured', () => {
    expect(() => {
      analyticsModule.initAnalytics();
      analyticsModule.identifyUser('user-123', 'test@nebron.com');
      analyticsModule.captureAnalytics('test_event', { key: 'val' });
      analyticsModule.resetUser();
    }).not.toThrow();
  });
});
