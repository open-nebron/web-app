import { apiFetch } from './api';
import type {
  ExploreSuggestionItem,
  ExploreTrendingPeriod,
  ExploreTrendingResponse,
  ExploreTrendingType,
  Post,
  ReelItem,
  SocialSearchResponse,
  SocialSearchType,
  UserProfileStats,
} from './types';

export const exploreApi = {
  async getTrending<T extends ExploreTrendingType = 'posts'>(params: {
    type?: T;
    period?: ExploreTrendingPeriod;
    limit?: number;
  } = {}): Promise<
    ExploreTrendingResponse<T extends 'reels' ? ReelItem : Post>
  > {
    const sp = new URLSearchParams();
    if (params.type) sp.set('type', params.type);
    if (params.period) sp.set('period', params.period);
    if (params.limit) sp.set('limit', String(params.limit));
    const q = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch(`/api/core/explore/trending${q}`);
  },

  async getSuggestions(limit: number = 10): Promise<ExploreSuggestionItem[]> {
    return apiFetch<ExploreSuggestionItem[]>(
      `/api/core/explore/suggestions?limit=${limit}`
    );
  },

  async getUserStats(userId: string): Promise<UserProfileStats> {
    return apiFetch<UserProfileStats>(
      `/api/core/users/${encodeURIComponent(userId)}/stats`
    );
  },

  async getMyStats(): Promise<UserProfileStats> {
    return apiFetch<UserProfileStats>('/api/core/users/me/stats');
  },

  async searchSocial<T extends SocialSearchType = 'posts'>(params: {
    q: string;
    type?: T;
    limit?: number;
  }): Promise<SocialSearchResponse<T extends 'reels' ? ReelItem : Post>> {
    const sp = new URLSearchParams();
    sp.set('q', params.q);
    if (params.type) sp.set('type', params.type);
    if (params.limit) sp.set('limit', String(params.limit));
    return apiFetch(`/api/core/search/social?${sp.toString()}`);
  },
};
