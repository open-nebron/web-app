import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsApi } from './analytics-api';
import { socialApi } from './social-api';
import * as apiModule from './api';
import { makeImpressionSessionKey, shouldSendImpression } from './beacons';
import { buildStackedFollowSourceSeries, sortRowsByKey } from './analytics-utils';

describe('V4-5 Analytics Frontend Client, Beacons & Helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls beacon ingestion endpoints with expected payloads', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({ viewId: 'v123' } as any);

    await analyticsApi.recordImpression({
      contentType: 'post',
      contentId: '65f000000000000000000001',
      source: 'feed',
    });
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/impression', {
      method: 'POST',
      body: JSON.stringify({
        contentType: 'post',
        contentId: '65f000000000000000000001',
        source: 'feed',
      }),
    });

    const startRes = await analyticsApi.startView({
      contentType: 'reel',
      contentId: '65f000000000000000000002',
      source: 'feed',
      totalSeconds: 15,
    });
    expect(startRes.viewId).toBe('v123');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/view-start', {
      method: 'POST',
      body: JSON.stringify({
        contentType: 'reel',
        contentId: '65f000000000000000000002',
        source: 'feed',
        totalSeconds: 15,
      }),
    });

    await analyticsApi.heartbeatView({ viewId: 'v123', watchedSeconds: 5 });
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/view-heartbeat', {
      method: 'POST',
      body: JSON.stringify({ viewId: 'v123', watchedSeconds: 5 }),
    });

    await analyticsApi.endView({
      viewId: 'v123',
      watchedSeconds: 15,
      completed: true,
    });
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/view-end', {
      method: 'POST',
      body: JSON.stringify({ viewId: 'v123', watchedSeconds: 15, completed: true }),
      keepalive: true,
    });

    await analyticsApi.recordProfileVisit('user-target-1');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/profile-visit', {
      method: 'POST',
      body: JSON.stringify({ visitedUserId: 'user-target-1' }),
    });
  });

  it('calls creator analytics query endpoints with period & pagination params', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({} as any);

    await analyticsApi.getOverview('7d');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/overview?period=7d');

    await analyticsApi.getPostsAnalytics({ period: '30d', limit: 25 });
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/posts?period=30d&limit=25');

    await analyticsApi.getReelsAnalytics({ period: '90d', limit: 10 });
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/reels?period=90d&limit=10');

    await analyticsApi.getStoriesAnalytics({ period: '7d' });
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/stories?period=7d');

    await analyticsApi.getContentDeepDive('reel', 'abc123', '30d');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/content/reel/abc123?period=30d');

    await analyticsApi.getAudienceAnalytics('90d');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/audience?period=90d');
  });

  it('forwards X-Follow-Source header on socialApi.follow when provided', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValue(undefined as any);

    await socialApi.follow('user-2', 'reel');
    expect(spy).toHaveBeenCalledWith('/api/core/users/user-2/follow', {
      method: 'POST',
      headers: { 'X-Follow-Source': 'reel' },
    });

    await socialApi.follow('user-3');
    expect(spy).toHaveBeenCalledWith('/api/core/users/user-3/follow', {
      method: 'POST',
      headers: undefined,
    });
  });

  it('debounces duplicate impressions per session key', () => {
    const sent = new Set<string>();
    expect(makeImpressionSessionKey('post', 'p1')).toBe('post:p1');
    expect(shouldSendImpression('post', 'p1', sent)).toBe(true);
    expect(shouldSendImpression('post', 'p1', sent)).toBe(false);
    expect(shouldSendImpression('reel', 'p1', sent)).toBe(true);
    expect(shouldSendImpression('post', '', sent)).toBe(false);
  });

  it('sorts analytics rows accurately in ascending and descending order', () => {
    const rows = [
      { id: 'a', views: 5, label: 'Zeta' },
      { id: 'b', views: 20, label: 'Alpha' },
      { id: 'c', views: 10, label: 'Beta' },
    ];
    expect(sortRowsByKey(rows, 'views', 'desc').map((r) => r.id)).toEqual(['b', 'c', 'a']);
    expect(sortRowsByKey(rows, 'views', 'asc').map((r) => r.id)).toEqual(['a', 'c', 'b']);
    expect(sortRowsByKey(rows, 'label', 'asc').map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('fetches content engagement depth metrics via analyticsApi.getContentDepth (V4.5-1)', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({ discussionScore: 12 } as any);

    const res = await analyticsApi.getContentDepth('post', 'post-42');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/content/post/post-42/depth');
    expect(res.discussionScore).toBe(12);
  });

  it('calls Stage V4.5-2 insights endpoints and builds stacked follow source series', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValue({} as any);

    await analyticsApi.getContentCurve('reel', 'r1');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/content/reel/r1/curve');

    await analyticsApi.getContentTraffic('post', 'p1');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/content/post/p1/traffic');

    await analyticsApi.getCohortComparison('post', 'p1', '7d_ago');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/content/post/p1/compare?against=7d_ago');

    await analyticsApi.getContentSpeed('post', 'p1');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/content/post/p1/speed');

    await analyticsApi.getContentDecay('post', 'p1');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/content/post/p1/decay');

    await analyticsApi.getHashtagsAnalytics('7d', 15);
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/hashtags?period=7d&limit=15');

    await analyticsApi.getBestTime('reel', '30d');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/best-time?period=30d&contentType=reel');

    await analyticsApi.getAudienceActivity('30d');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/audience/activity?period=30d');

    await analyticsApi.getAudienceGrowth('90d');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/audience/growth?period=90d');

    await analyticsApi.getAudienceSources('30d');
    expect(spy).toHaveBeenCalledWith('/api/core/analytics/me/audience/sources?period=30d');

    await analyticsApi.getCrossContentCompare('post', ['p1', 'p2']);
    expect(spy).toHaveBeenCalledWith(
      '/api/core/analytics/me/compare?contentType=post&contentIds=p1%2Cp2'
    );

    const stacked = buildStackedFollowSourceSeries(
      ['2026-11-27', '2026-11-28'],
      [
        { date: '2026-11-27', source: 'reel', count: 3 },
        { date: '2026-11-28', source: 'profile', count: 2 },
      ]
    );
    expect(stacked).toHaveLength(2);
    expect(stacked[0]).toMatchObject({ date: '2026-11-27', reel: 3, profile: 0 });
    expect(stacked[1]).toMatchObject({ date: '2026-11-28', profile: 2, reel: 0 });
  });
});
