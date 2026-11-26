import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateReelVideoFile,
  validateReelDuration,
  hasViewedReelInSession,
  markReelViewedInSession,
  VIEWED_REELS_STORAGE_KEY,
  MAX_REEL_VIDEO_BYTES,
  reelsApi,
} from './reels-api';

describe('Reels frontend utilities and API client', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      value: {
        sessionStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => {
            store.set(k, v);
          },
          removeItem: (k: string) => {
            store.delete(k);
          },
          clear: () => store.clear(),
        },
      },
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('validates MP4 mime type and 50MB size limit', () => {
    expect(validateReelVideoFile({ type: 'video/mp4', size: 1024 * 1024 })).toBeNull();
    expect(validateReelVideoFile({ type: 'video/webm', size: 1024 })).toMatch(/MP4/i);
    expect(validateReelVideoFile({ type: 'video/mp4', size: 0 })).toMatch(/empty/i);
    expect(validateReelVideoFile({ type: 'video/mp4', size: MAX_REEL_VIDEO_BYTES + 1 })).toMatch(
      /50MB/i
    );
  });

  it('validates reel duration strictly within 5-60 seconds', () => {
    expect(validateReelDuration(4.9)).toMatch(/at least 5/i);
    expect(validateReelDuration(5)).toBeNull();
    expect(validateReelDuration(32.4)).toBeNull();
    expect(validateReelDuration(60)).toBeNull();
    expect(validateReelDuration(60.1)).toMatch(/exceed 60/i);
    expect(validateReelDuration(Number.NaN)).toMatch(/duration/i);
  });

  it('deduplicates recorded views per session via sessionStorage viewed_reels', () => {
    expect(hasViewedReelInSession('reel_1')).toBe(false);
    markReelViewedInSession('reel_1');
    markReelViewedInSession('reel_1');
    markReelViewedInSession('reel_2');

    expect(hasViewedReelInSession('reel_1')).toBe(true);
    expect(hasViewedReelInSession('reel_2')).toBe(true);

    const saved = JSON.parse(window.sessionStorage.getItem(VIEWED_REELS_STORAGE_KEY)!);
    expect(saved).toEqual(['reel_1', 'reel_2']);
  });

  it('aborts presigned upload cleanly when AbortSignal fires', async () => {
    const controller = new AbortController();
    controller.abort();

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          uploadUrl: 'http://localhost:9000/nebron-media',
          fields: { key: 'reels/u1/v1.mp4' },
          objectKey: 'reels/u1/v1.mp4',
          expiresAt: new Date().toISOString(),
          maxBytes: MAX_REEL_VIDEO_BYTES,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const file = new File(['dummy'], 'clip.mp4', { type: 'video/mp4' });
    await expect(reelsApi.uploadReelVideo(file, undefined, controller.signal)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
