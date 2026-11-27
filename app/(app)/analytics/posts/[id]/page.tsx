'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Bookmark, Eye, FileText, Heart, MessageCircle, Share2, UserCheck, UserPlus } from 'lucide-react';
import { useContentDeepDive } from '@/hooks/useAnalytics';
import {
  AnalyticsHeader,
  AnalyticsStatCard,
  formatShortDate,
} from '@/components/analytics/analytics-shell';
import {
  AnalyticsLineChart,
  TrafficSourcesPieChart,
} from '@/components/analytics/analytics-charts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeStorageUrl } from '@/lib/utils';
import type { AnalyticsPeriod } from '@/lib/types';

export default function PostAnalyticsDetailPage() {
  const params = useParams();
  const postId = typeof params?.id === 'string' ? params.id : '';
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');

  const { data, isLoading, isError } = useContentDeepDive('post', postId, period);

  const seriesData = React.useMemo(
    () =>
      (data?.series ?? []).map((b) => ({
        ...b,
        label: formatShortDate(b.date),
      })),
    [data]
  );

  const pieData = React.useMemo(
    () =>
      (data?.trafficSources ?? []).map((s) => ({
        name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
        value: s.count,
      })),
    [data]
  );

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Post Performance"
        subtitle="Time-series trends, traffic sources, and profile attribution."
        period={period}
        onPeriodChange={setPeriod}
        backHref="/analytics/posts"
        backLabel="All posts analytics"
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          </div>
        ) : isError || !data ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Could not load analytics for this post.
          </div>
        ) : (
          <>
            {/* Content summary card */}
            <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {data.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={normalizeStorageUrl(data.thumbnailUrl)}
                    alt={data.preview}
                    className="w-16 h-16 rounded-lg object-cover border shrink-0 bg-muted"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border bg-muted/60 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-sm text-foreground line-clamp-2">
                    {data.preview || 'Text post'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Published {new Date(data.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={`/posts/${postId}`}>View Post</Link>
              </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <AnalyticsStatCard label="Impressions" value={data.totals.impressions} sublabel={`${data.totals.reach} reach`} icon={Eye} />
              <AnalyticsStatCard label="Likes" value={data.totals.likes} icon={Heart} />
              <AnalyticsStatCard label="Comments" value={data.totals.comments} icon={MessageCircle} />
              <AnalyticsStatCard label="Shares" value={data.totals.shares} icon={Share2} />
              <AnalyticsStatCard label="Saves" value={data.totals.saves} icon={Bookmark} />
              <AnalyticsStatCard
                label="Profile Visits"
                value={data.profileVisits}
                sublabel={`+${data.newFollowers} follows`}
                icon={UserCheck}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Performance Over Time</h2>
                  <p className="text-xs text-muted-foreground">
                    Daily impressions, likes, comments, shares, and saves
                  </p>
                </div>
                <AnalyticsLineChart
                  data={seriesData}
                  xKey="label"
                  series={[
                    { dataKey: 'impressions', name: 'Impressions', color: '#6366f1' },
                    { dataKey: 'likes', name: 'Likes', color: '#ec4899' },
                    { dataKey: 'saves', name: 'Saves', color: '#f59e0b' },
                    { dataKey: 'shares', name: 'Shares', color: '#14b8a6' },
                  ]}
                  testId="post-detail-timeseries-chart"
                />
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Traffic Sources</h2>
                  <p className="text-xs text-muted-foreground">
                    Where viewers discovered this post
                  </p>
                </div>
                <TrafficSourcesPieChart data={pieData} testId="post-detail-traffic-pie" />
                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                    Attributed follows
                  </span>
                  <span className="font-semibold text-foreground">{data.newFollowers}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
