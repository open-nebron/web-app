'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/analytics-api';
import { storiesApi } from '@/lib/stories-api';
import type { AnalyticsContentType, AnalyticsPeriod } from '@/lib/types';

export function useAnalyticsOverview(period: AnalyticsPeriod = '30d') {
  return useQuery({
    queryKey: ['analytics', 'overview', period],
    queryFn: () => analyticsApi.getOverview(period),
    staleTime: 30_000,
  });
}

export function usePostAnalyticsList(period: AnalyticsPeriod = '30d', limit: number = 50) {
  return useQuery({
    queryKey: ['analytics', 'posts', period, limit],
    queryFn: () => analyticsApi.getPostsAnalytics({ period, limit }),
    staleTime: 30_000,
  });
}

export function useReelAnalyticsList(period: AnalyticsPeriod = '30d', limit: number = 50) {
  return useQuery({
    queryKey: ['analytics', 'reels', period, limit],
    queryFn: () => analyticsApi.getReelsAnalytics({ period, limit }),
    staleTime: 30_000,
  });
}

export function useStoryAnalyticsList(period: AnalyticsPeriod = '30d', limit: number = 50) {
  return useQuery({
    queryKey: ['analytics', 'stories', period, limit],
    queryFn: () => analyticsApi.getStoriesAnalytics({ period, limit }),
    staleTime: 30_000,
  });
}

export function useContentDeepDive(
  contentType: AnalyticsContentType,
  contentId: string,
  period: AnalyticsPeriod = '30d'
) {
  return useQuery({
    queryKey: ['analytics', 'content', contentType, contentId, period],
    queryFn: () => analyticsApi.getContentDeepDive(contentType, contentId, period),
    enabled: Boolean(contentId),
    staleTime: 30_000,
  });
}

export function useAudienceAnalytics(period: AnalyticsPeriod = '30d') {
  return useQuery({
    queryKey: ['analytics', 'audience', period],
    queryFn: () => analyticsApi.getAudienceAnalytics(period),
    staleTime: 30_000,
  });
}

export function useStoryAnalyticsViewers(storyId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['analytics', 'story-viewers', storyId],
    queryFn: () => storiesApi.getStoryViewers(storyId),
    enabled: enabled && Boolean(storyId),
    staleTime: 30_000,
  });
}
