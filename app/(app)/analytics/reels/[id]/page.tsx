'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Bookmark, Clock, Eye, Film, Heart, Repeat, Share2, CheckCircle2 } from 'lucide-react';
import { useContentDeepDive } from '@/hooks/useAnalytics';
import {
  AnalyticsHeader,
  AnalyticsStatCard,
  formatDuration,
  formatShortDate,
} from '@/components/analytics/analytics-shell';
import {
  AnalyticsBarChart,
  AnalyticsLineChart,
  TrafficSourcesPieChart,
} from '@/components/analytics/analytics-charts';
import { EngagementDepthPanel } from '@/components/analytics/engagement-depth-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { normalizeStorageUrl } from '@/lib/utils';
import type { AnalyticsPeriod } from '@/lib/types';

export default function ReelAnalyticsDetailPage() {
  const params = useParams();
  const reelId = typeof params?.id === 'string' ? params.id : '';
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const [activeTab, setActiveTab] = React.useState<'overview' | 'depth'>('overview');

  React.useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('tab') === 'depth'
    ) {
      setActiveTab('depth');
    }
  }, []);

  const { data, isLoading, isError } = useContentDeepDive('reel', reelId, period);

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

  const avgWatchSeconds =
    data && data.totals.views > 0 ? data.totals.watchSeconds / data.totals.views : 0;
  const completionRate =
    data && data.totals.views > 0
      ? Number(((data.totals.completions / data.totals.views) * 100).toFixed(1))
      : 0;

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Reel Performance"
        subtitle="Watch-through retention drop-off, traffic sources, and daily performance."
        period={period}
        onPeriodChange={setPeriod}
        backHref="/analytics/reels"
        backLabel="All reels analytics"
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
            Could not load analytics for this reel.
          </div>
        ) : (
          <>
            <div className="rounded-xl border bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {data.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={normalizeStorageUrl(data.thumbnailUrl)}
                    alt={data.preview}
                    className="w-14 h-16 rounded-lg object-cover border shrink-0 bg-muted"
                  />
                ) : (
                  <div className="w-14 h-16 rounded-lg border bg-muted/60 flex items-center justify-center shrink-0">
                    <Film className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-sm text-foreground line-clamp-2">
                    {data.preview || 'Reel'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Published {new Date(data.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={`/reels/${reelId}`}>Watch Reel</Link>
              </Button>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'overview' | 'depth')}
              className="space-y-6"
            >
              <TabsList data-testid="reel-analytics-tabs">
                <TabsTrigger value="overview" data-testid="reel-tab-overview">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="depth" data-testid="reel-tab-depth">
                  Depth
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <AnalyticsStatCard label="Views" value={data.totals.views} sublabel={`${data.totals.uniqueViews} unique`} icon={Eye} />
                  <AnalyticsStatCard label="Avg Watch" value={formatDuration(avgWatchSeconds)} icon={Clock} />
                  <AnalyticsStatCard label="Completion" value={`${completionRate}%`} icon={CheckCircle2} />
                  <AnalyticsStatCard label="Replays" value={data.totals.replays} icon={Repeat} />
                  <AnalyticsStatCard label="Likes" value={data.totals.likes} sublabel={`${data.totals.comments} comments`} icon={Heart} />
                  <AnalyticsStatCard label="Saves" value={data.totals.saves} sublabel={`${data.totals.shares} shares`} icon={Bookmark} />
                </div>

                {/* Watch-through Drop-Off + Traffic Sources */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm space-y-4">
                    <div>
                      <h2 className="text-base font-semibold">Watch-Through Retention</h2>
                      <p className="text-xs text-muted-foreground">
                        Percentage of viewers reaching each playback decile (0–100%)
                      </p>
                    </div>
                    <AnalyticsBarChart
                      data={data.watchThroughBuckets ?? []}
                      xKey="bucket"
                      bars={[{ dataKey: 'percentage', name: 'Retention %', color: '#6366f1' }]}
                      testId="reel-watch-through-chart"
                    />
                  </div>

                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                    <div>
                      <h2 className="text-base font-semibold">Traffic Sources</h2>
                      <p className="text-xs text-muted-foreground">
                        Where viewers found this reel
                      </p>
                    </div>
                    <TrafficSourcesPieChart data={pieData} testId="reel-traffic-pie" />
                    <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-primary" />
                        New followers from reels
                      </span>
                      <span className="font-semibold text-foreground">{data.newFollowers}</span>
                    </div>
                  </div>
                </div>

                {/* Time-series chart */}
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-base font-semibold">Daily Views & Engagement</h2>
                    <p className="text-xs text-muted-foreground">
                      Views, likes, saves, and shares across the selected period
                    </p>
                  </div>
                  <AnalyticsLineChart
                    data={seriesData}
                    xKey="label"
                    series={[
                      { dataKey: 'views', name: 'Views', color: '#6366f1' },
                      { dataKey: 'likes', name: 'Likes', color: '#ec4899' },
                      { dataKey: 'saves', name: 'Saves', color: '#f59e0b' },
                      { dataKey: 'shares', name: 'Shares', color: '#14b8a6' },
                    ]}
                    testId="reel-detail-timeseries-chart"
                  />
                </div>
              </TabsContent>

              <TabsContent value="depth" className="mt-0">
                <EngagementDepthPanel
                  contentType="reel"
                  contentId={reelId}
                  enabled={activeTab === 'depth'}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
