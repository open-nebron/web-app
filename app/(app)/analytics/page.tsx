'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Eye,
  Film,
  FileText,
  Flame,
  Heart,
  Radio,
  UserCheck,
  Users,
  Bookmark,
  MessageCircle,
  Share2,
} from 'lucide-react';
import {
  useAnalyticsAudienceSources,
  useAnalyticsBestTime,
  useAnalyticsOverview,
} from '@/hooks/useAnalytics';
import {
  AnalyticsHeader,
  AnalyticsStatCard,
  formatShortDate,
} from '@/components/analytics/analytics-shell';
import {
  AnalyticsBarChart,
  AnalyticsLineChart,
} from '@/components/analytics/analytics-charts';
import { ActivityHeatmap } from '@/components/analytics/activity-heatmap';
import { Skeleton } from '@/components/ui/skeleton';
import { buildStackedFollowSourceSeries, FOLLOW_SOURCE_SERIES } from '@/lib/analytics-utils';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import type { AnalyticsContentType, AnalyticsPeriod, OverviewTopContentItem } from '@/lib/types';

function contentRoute(type: AnalyticsContentType, id: string): string {
  if (type === 'post') return `/analytics/posts/${id}`;
  if (type === 'reel') return `/analytics/reels/${id}`;
  return `/analytics/stories/${id}`;
}

function SpotlightCard({
  label,
  item,
  icon: Icon,
  emptyHref,
}: {
  label: string;
  item: OverviewTopContentItem | null;
  icon: React.ComponentType<{ className?: string }>;
  emptyHref: string;
}) {
  if (!item) {
    return (
      <Link
        href={emptyHref}
        className="rounded-xl border border-dashed bg-card/50 p-4 flex flex-col justify-between hover:bg-accent/30 transition-colors min-h-[148px]"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="w-4 h-4 text-primary/70" />
          <span>{label}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          No activity recorded for {label.toLowerCase()} in this period.
        </p>
      </Link>
    );
  }

  return (
    <Link
      href={contentRoute(item.contentType, item.contentId)}
      data-testid={`top-content-card-${item.contentType}`}
      className="rounded-xl border bg-card p-4 shadow-sm hover:border-primary/50 transition-colors flex flex-col justify-between gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </span>
          <p className="text-sm font-medium text-foreground line-clamp-2">
            {item.preview || `${item.contentType} #${item.contentId.slice(-6)}`}
          </p>
        </div>

        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={normalizeStorageUrl(item.thumbnailUrl)}
            alt={item.preview}
            className="w-12 h-12 rounded-lg object-cover border shrink-0 bg-muted"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg border bg-muted/60 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 pt-2 border-t text-xs text-muted-foreground">
        <div>
          <p className="font-semibold text-foreground">{item.metrics.impressions}</p>
          <p className="text-[11px]">Impr.</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{item.metrics.views}</p>
          <p className="text-[11px]">Views</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{item.metrics.likes}</p>
          <p className="text-[11px]">Likes</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{item.metrics.saves}</p>
          <p className="text-[11px]">Saves</p>
        </div>
      </div>
    </Link>
  );
}

export default function AnalyticsOverviewPage() {
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const [bestTimeFilter, setBestTimeFilter] = React.useState<'all' | AnalyticsContentType>('all');
  const { data, isLoading, isError } = useAnalyticsOverview(period);
  const { data: sourcesData } = useAnalyticsAudienceSources(period);
  const { data: bestTimeData } = useAnalyticsBestTime(
    bestTimeFilter === 'all' ? undefined : bestTimeFilter,
    period
  );

  const chartData = React.useMemo(
    () =>
      (data?.dailyActivity ?? []).map((d) => ({
        ...d,
        label: formatShortDate(d.date),
      })),
    [data]
  );

  const stackedFollowerData = React.useMemo(() => {
    const dates = (data?.dailyActivity ?? []).map((d) => d.date);
    return buildStackedFollowSourceSeries(dates, sourcesData?.trend ?? []);
  }, [data, sourcesData]);

  const hasAttributedFollows = (sourcesData?.trend?.length ?? 0) > 0;

  const totalEngagement = data
    ? data.engagement.likes +
      data.engagement.comments +
      data.engagement.shares +
      data.engagement.saves
    : 0;

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Creator Studio"
        subtitle="Track reach, engagement, follower growth, and top performing content."
        period={period}
        onPeriodChange={setPeriod}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          </div>
        ) : isError || !data ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Unable to load analytics overview right now.
          </div>
        ) : (
          <>
            {/* 4 Key Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AnalyticsStatCard
                label="Followers"
                value={data.followers.total}
                sublabel={`+${data.followers.gained} in last ${period}`}
                icon={Users}
                testId="stat-card-followers"
              />
              <AnalyticsStatCard
                label="Total Reach"
                value={data.engagement.reach}
                sublabel={`${data.engagement.impressions} impressions`}
                icon={Eye}
                testId="stat-card-reach"
              />
              <AnalyticsStatCard
                label="Total Engagement"
                value={totalEngagement}
                sublabel={`${data.engagement.likes} likes · ${data.engagement.saves} saves`}
                icon={Flame}
                testId="stat-card-engagement"
              />
              <AnalyticsStatCard
                label="Profile Visits"
                value={data.profileVisits}
                sublabel={`${data.engagement.views} total views`}
                icon={UserCheck}
                testId="stat-card-profile-visits"
              />
            </div>

            {/* Secondary Engagement Breakdown Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-card/70 px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> Likes
                </span>
                <span className="font-semibold text-foreground" data-testid="overview-likes-count">
                  {data.engagement.likes}
                </span>
              </div>
              <div className="rounded-lg border bg-card/70 px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <MessageCircle className="w-3.5 h-3.5 text-blue-500" /> Comments
                </span>
                <span className="font-semibold text-foreground" data-testid="overview-comments-count">
                  {data.engagement.comments}
                </span>
              </div>
              <div className="rounded-lg border bg-card/70 px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Share2 className="w-3.5 h-3.5 text-emerald-500" /> Shares
                </span>
                <span className="font-semibold text-foreground" data-testid="overview-shares-count">
                  {data.engagement.shares}
                </span>
              </div>
              <div className="rounded-lg border bg-card/70 px-3.5 py-2.5 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" /> Saves
                </span>
                <span className="font-semibold text-foreground" data-testid="overview-saves-count">
                  {data.engagement.saves}
                </span>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">Follower Growth</h2>
                    <p className="text-xs text-muted-foreground">
                      {hasAttributedFollows
                        ? `New followers by source breakdown (${period})`
                        : `New followers gained per day (${period})`}
                    </p>
                  </div>
                  {sourcesData?.topSource && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                      Top source: {sourcesData.topSource}
                    </span>
                  )}
                </div>
                {hasAttributedFollows ? (
                  <AnalyticsBarChart
                    data={stackedFollowerData}
                    xKey="label"
                    bars={FOLLOW_SOURCE_SERIES}
                    testId="chart-follower-growth"
                  />
                ) : (
                  <AnalyticsLineChart
                    data={chartData}
                    xKey="label"
                    series={[{ dataKey: 'followersGained', name: 'New Followers', color: '#6366f1' }]}
                    testId="chart-follower-growth"
                  />
                )}
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Engagement by Day</h2>
                  <p className="text-xs text-muted-foreground">
                    Likes, comments, shares, and saves per day
                    {data.bestPerformingDay ? ` · Best day: ${data.bestPerformingDay}` : ''}
                  </p>
                </div>
                <AnalyticsBarChart
                  data={chartData}
                  xKey="label"
                  bars={[
                    { dataKey: 'engagement', name: 'Interactions', color: '#14b8a6' },
                    { dataKey: 'views', name: 'Views', color: '#8b5cf6' },
                  ]}
                  testId="chart-engagement-by-day"
                />
              </div>
            </div>

            {/* Top Performing Content (Post, Reel, Story) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span>Top Performing Content</span>
                </h2>
                <span className="text-xs text-muted-foreground">
                  {data.content.posts} posts · {data.content.reels} reels · {data.content.stories} stories created
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SpotlightCard
                  label="Top Post"
                  item={data.topByType?.post ?? null}
                  icon={FileText}
                  emptyHref="/analytics/posts"
                />
                <SpotlightCard
                  label="Top Reel"
                  item={data.topByType?.reel ?? null}
                  icon={Film}
                  emptyHref="/analytics/reels"
                />
                <SpotlightCard
                  label="Top Story"
                  item={data.topByType?.story ?? null}
                  icon={Radio}
                  emptyHref="/analytics/stories"
                />
              </div>
            </div>

            {/* 7x24 Best Time to Post Heatmap */}
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Best Time to Post</h2>
                  <p className="text-xs text-muted-foreground">
                    {bestTimeData?.recommendation ||
                      'Hourly engagement and view activity across days of the week'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border bg-card p-0.5 text-xs">
                    {(['all', 'post', 'reel', 'story'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBestTimeFilter(t)}
                        data-testid={`best-time-filter-${t}`}
                        className={cn(
                          'px-2.5 py-1 rounded-md capitalize transition-colors',
                          bestTimeFilter === t
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {(bestTimeData?.top3Hours?.length ? bestTimeData.top3Hours : data.bestTimeToPost).length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Top hours:</span>
                      {(bestTimeData?.top3Hours?.length
                        ? bestTimeData.top3Hours
                        : data.bestTimeToPost
                      )
                        .slice(0, 3)
                        .map((h) => (
                          <span
                            key={h}
                            className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                          >
                            {String(h).padStart(2, '0')}:00 UTC
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <ActivityHeatmap
                matrix={data.activityHeatmap}
                unitLabel="events"
                hourDetails={bestTimeData?.hours}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
