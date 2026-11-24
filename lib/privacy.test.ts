import { describe, it, expect, vi, beforeEach } from 'vitest';
import { coreApi } from './api';
import { useAuthStore } from './auth-store';

describe('Web Privacy Settings Client API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().setAccessToken('mock_access_token');
  });

  it('getPrivacy fetches from /api/core/me/privacy with auth header', async () => {
    const mockPrivacy = {
      showOnlineStatus: 'nobody',
      showLastSeen: 'nobody',
      sendReadReceipts: false,
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPrivacy,
    } as any);

    const result = await coreApi.getPrivacy();

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/core/me/privacy',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
    expect(result).toEqual(mockPrivacy);
  });

  it('updatePrivacy sends PATCH to /api/core/me/privacy with payload', async () => {
    const patch = {
      showOnlineStatus: 'contacts' as const,
      sendReadReceipts: true,
    };

    const updated = {
      showOnlineStatus: 'contacts',
      showLastSeen: 'contacts',
      sendReadReceipts: true,
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => updated,
    } as any);

    const result = await coreApi.updatePrivacy(patch);

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/core/me/privacy',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
    );
    expect(result).toEqual(updated);
  });
});
