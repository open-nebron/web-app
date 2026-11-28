'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/analytics-api';
import { storiesApi } from '@/lib/stories-api';
import type { AnalyticsContentType, AnalyticsPeriod, CompareAgainst } from '@/lib/types';

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

export function useContentDepth(
  contentType: AnalyticsContentType,
  contentId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'content-depth', contentType, contentId],
    queryFn: () => analyticsApi.getContentDepth(contentType, contentId),
    enabled: enabled && Boolean(contentId),
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

export function useAnalyticsCurve(
  contentType: AnalyticsContentType,
  contentId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'curve', contentType, contentId],
    queryFn: () => analyticsApi.getContentCurve(contentType, contentId),
    enabled: enabled && Boolean(contentId),
    staleTime: 30_000,
  });
}

export function useAnalyticsTraffic(
  contentType: AnalyticsContentType,
  contentId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'traffic', contentType, contentId],
    queryFn: () => analyticsApi.getContentTraffic(contentType, contentId),
    enabled: enabled && Boolean(contentId),
    staleTime: 30_000,
  });
}

export function useAnalyticsCompare(
  contentType: AnalyticsContentType,
  contentId: string,
  against: CompareAgainst = 'previous_post',
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'compare', contentType, contentId, against],
    queryFn: () => analyticsApi.getCohortComparison(contentType, contentId, against),
    enabled: enabled && Boolean(contentId),
    staleTime: 30_000,
  });
}

export function useAnalyticsSpeed(
  contentType: AnalyticsContentType,
  contentId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'speed', contentType, contentId],
    queryFn: () => analyticsApi.getContentSpeed(contentType, contentId),
    enabled: enabled && Boolean(contentId),
    staleTime: 30_000,
  });
}

export function useAnalyticsDecay(
  contentType: AnalyticsContentType,
  contentId: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['analytics', 'decay', contentType, contentId],
    queryFn: () => analyticsApi.getContentDecay(contentType, contentId),
    enabled: enabled && Boolean(contentId),
    staleTime: 30_000,
  });
}

export function useAnalyticsHashtags(period: AnalyticsPeriod = '30d', limit: number = 20) {
  return useQuery({
    queryKey: ['analytics', 'hashtags', period, limit],
    queryFn: () => analyticsApi.getHashtagsAnalytics(period, limit),
    staleTime: 30_000,
  });
}

export function useAnalyticsBestTime(
  contentType?: AnalyticsContentType,
  period: AnalyticsPeriod = '30d'
) {
  return useQuery({
    queryKey: ['analytics', 'best-time', contentType ?? 'all', period],
    queryFn: () => analyticsApi.getBestTime(contentType, period),
    staleTime: 30_000,
  });
}

export function useAnalyticsAudienceGrowth(period: AnalyticsPeriod = '30d', enabled: boolean = true) {
  return useQuery({
    queryKey: ['analytics', 'audience-growth', period],
    queryFn: () => analyticsApi.getAudienceGrowth(period),
    enabled,
    staleTime: 30_000,
  });
}

export function useAnalyticsAudienceActivity(period: AnalyticsPeriod = '30d', enabled: boolean = true) {
  return useQuery({
    queryKey: ['analytics', 'audience-activity', period],
    queryFn: () => analyticsApi.getAudienceActivity(period),
    enabled,
    staleTime: 30_000,
  });
}

export function useAnalyticsAudienceSources(period: AnalyticsPeriod = '30d', enabled: boolean = true) {
  return useQuery({
    queryKey: ['analytics', 'audience-sources', period],
    queryFn: () => analyticsApi.getAudienceSources(period),
    enabled,
    staleTime: 30_000,
  });
}

export function useCrossContentCompare(
  contentType: AnalyticsContentType,
  contentIds: string[],
  enabled: boolean = true
) {
  const joined = contentIds.join(',');
  return useQuery({
    queryKey: ['analytics', 'cross-compare', contentType, joined],
    queryFn: () => analyticsApi.getCrossContentCompare(contentType, contentIds),
    enabled: enabled && contentIds.length >= 1,
    staleTime: 30_000,
  });
}
