import { apiFetch } from './api';
import type {
  AnalyticsContentType,
  AnalyticsOverviewResponse,
  AnalyticsPeriod,
  AnalyticsSource,
  AudienceAnalyticsResponse,
  ContentAnalyticsDeepDiveResponse,
  ContentEngagementDepthResponse,
  PostAnalyticsRow,
  ReelAnalyticsRow,
  StoryAnalyticsRow,
} from './types';

export interface ImpressionPayload {
  contentType: AnalyticsContentType;
  contentId: string;
  source: AnalyticsSource;
}

export interface ViewStartPayload {
  contentType: 'reel' | 'story';
  contentId: string;
  source?: string;
  sessionId?: string;
  totalSeconds?: number;
  replayed?: boolean;
}

export interface ViewHeartbeatPayload {
  viewId: string;
  watchedSeconds: number;
  currentPosition?: number;
  tapsForward?: number;
  tapsBack?: number;
}

export interface ViewEndPayload {
  viewId: string;
  watchedSeconds: number;
  completed: boolean;
  tapsForward?: number;
  tapsBack?: number;
  exited?: boolean;
  replayed?: boolean;
}

export interface AnalyticsListParams {
  period?: AnalyticsPeriod;
  limit?: number;
  before?: string;
}

export const analyticsApi = {
  async recordImpression(payload: ImpressionPayload): Promise<void> {
    return apiFetch<void>('/api/core/analytics/impression', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async startView(payload: ViewStartPayload): Promise<{ viewId: string }> {
    return apiFetch<{ viewId: string }>('/api/core/analytics/view-start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async heartbeatView(payload: ViewHeartbeatPayload): Promise<void> {
    return apiFetch<void>('/api/core/analytics/view-heartbeat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async endView(payload: ViewEndPayload): Promise<void> {
    return apiFetch<void>('/api/core/analytics/view-end', {
      method: 'POST',
      body: JSON.stringify(payload),
      keepalive: true,
    });
  },

  async recordProfileVisit(visitedUserId: string): Promise<void> {
    return apiFetch<void>('/api/core/analytics/profile-visit', {
      method: 'POST',
      body: JSON.stringify({ visitedUserId }),
    });
  },

  async getOverview(period: AnalyticsPeriod = '30d'): Promise<AnalyticsOverviewResponse> {
    return apiFetch<AnalyticsOverviewResponse>(`/api/core/analytics/me/overview?period=${period}`);
  },

  async getPostsAnalytics(params: AnalyticsListParams = {}): Promise<PostAnalyticsRow[]> {
    const sp = new URLSearchParams();
    if (params.period) sp.set('period', params.period);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<PostAnalyticsRow[]>(`/api/core/analytics/me/posts${q}`);
  },

  async getReelsAnalytics(params: AnalyticsListParams = {}): Promise<ReelAnalyticsRow[]> {
    const sp = new URLSearchParams();
    if (params.period) sp.set('period', params.period);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<ReelAnalyticsRow[]>(`/api/core/analytics/me/reels${q}`);
  },

  async getStoriesAnalytics(params: AnalyticsListParams = {}): Promise<StoryAnalyticsRow[]> {
    const sp = new URLSearchParams();
    if (params.period) sp.set('period', params.period);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<StoryAnalyticsRow[]>(`/api/core/analytics/me/stories${q}`);
  },

  async getContentDeepDive(
    contentType: AnalyticsContentType,
    contentId: string,
    period: AnalyticsPeriod = '30d'
  ): Promise<ContentAnalyticsDeepDiveResponse> {
    return apiFetch<ContentAnalyticsDeepDiveResponse>(
      `/api/core/analytics/me/content/${contentType}/${contentId}?period=${period}`
    );
  },

  async getContentDepth(
    contentType: AnalyticsContentType,
    contentId: string
  ): Promise<ContentEngagementDepthResponse> {
    return apiFetch<ContentEngagementDepthResponse>(
      `/api/core/analytics/me/content/${contentType}/${contentId}/depth`
    );
  },

  async getAudienceAnalytics(period: AnalyticsPeriod = '30d'): Promise<AudienceAnalyticsResponse> {
    return apiFetch<AudienceAnalyticsResponse>(`/api/core/analytics/me/audience?period=${period}`);
  },
};
