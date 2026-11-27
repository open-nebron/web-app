import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exploreApi } from './explore-api';
import * as apiModule from './api';

describe('V4-6 Explore, Profile Stats & Social Search API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls explore trending with type, period, and limit query params', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({ items: [] } as any);

    await exploreApi.getTrending({ type: 'reels', period: '24h', limit: 15 });
    expect(spy).toHaveBeenCalledWith('/api/core/explore/trending?type=reels&period=24h&limit=15');

    await exploreApi.getTrending();
    expect(spy).toHaveBeenCalledWith('/api/core/explore/trending');
  });

  it('calls explore suggestions and profile stats endpoints', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValue([] as any);

    await exploreApi.getSuggestions(8);
    expect(spy).toHaveBeenCalledWith('/api/core/explore/suggestions?limit=8');

    await exploreApi.getUserStats('user-99');
    expect(spy).toHaveBeenCalledWith('/api/core/users/user-99/stats');

    await exploreApi.getMyStats();
    expect(spy).toHaveBeenCalledWith('/api/core/users/me/stats');
  });

  it('calls /search/social with encoded q, type, and limit', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({ items: [] } as any);

    await exploreApi.searchSocial({ q: 'hello #world', type: 'posts', limit: 10 });
    expect(spy).toHaveBeenCalledWith(
      '/api/core/search/social?q=hello+%23world&type=posts&limit=10'
    );
  });
});
