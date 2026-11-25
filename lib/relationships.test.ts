import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatApi } from './chat-api';
import * as apiModule from './api';

describe('Relationships API (Mute / Unmute)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes backend response with "mute" property into both "mute" and "muted"', async () => {
    vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
      blocked: false,
      mute: {
        calls: true,
        messages: true,
        until: null,
      },
    });

    const rel = await chatApi.getRelationship('target-user-1');
    expect(rel.blocked).toBe(false);
    expect(rel.mute).toEqual({ calls: true, messages: true, until: null });
    expect(rel.muted).toEqual({ calls: true, messages: true, until: null });
  });

  it('normalizes backend response with "muted" property into both "mute" and "muted"', async () => {
    vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
      blocked: true,
      muted: {
        calls: false,
        messages: true,
      },
    });

    const rel = await chatApi.getRelationship('target-user-2');
    expect(rel.blocked).toBe(true);
    expect(rel.mute).toEqual({ calls: false, messages: true });
    expect(rel.muted).toEqual({ calls: false, messages: true });
  });

  it('provides safe default mute state if backend returns empty mute fields', async () => {
    vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
      blocked: false,
    });

    const rel = await chatApi.getRelationship('target-user-3');
    expect(rel.blocked).toBe(false);
    expect(rel.mute).toEqual({ calls: false, messages: false, until: null });
    expect(rel.muted).toEqual({ calls: false, messages: false, until: null });
  });

  it('sends POST to /api/core/relationships/:userId/mute with options when muting', async () => {
    const fetchSpy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({});

    await chatApi.muteUser('user-abc', { calls: true, messages: true });

    expect(fetchSpy).toHaveBeenCalledWith('/api/core/relationships/user-abc/mute', {
      method: 'POST',
      body: JSON.stringify({ calls: true, messages: true }),
    });
  });

  it('sends DELETE to /api/core/relationships/:userId/mute with NO body when unmuting', async () => {
    const fetchSpy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({});

    await chatApi.unmuteUser('user-abc');

    expect(fetchSpy).toHaveBeenCalledWith('/api/core/relationships/user-abc/mute', {
      method: 'DELETE',
    });
  });
});
