'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Eye, MessageSquare, Radio, Users } from 'lucide-react';
import { useContentDeepDive, useStoryAnalyticsViewers } from '@/hooks/useAnalytics';
import { AnalyticsHeader, AnalyticsStatCard } from '@/components/analytics/analytics-shell';
import { AnalyticsBarChart } from '@/components/analytics/analytics-charts';
import {
  ContentComparePanel,
  ContentRetentionPanel,
  ContentTrafficPanel,
} from '@/components/analytics/content-insight-tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { normalizeStorageUrl } from '@/lib/utils';
import type { AnalyticsPeriod } from '@/lib/types';

type StoryDetailTab = 'overview' | 'retention' | 'traffic' | 'compare';

export default function StoryAnalyticsDetailPage() {
  const params = useParams();
  const storyId = typeof params?.id === 'string' ? params.id : '';
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const [activeTab, setActiveTab] = React.useState<StoryDetailTab>('overview');

  const { data, isLoading, isError } = useContentDeepDive('story', storyId, period);
  const {
    data: viewersData,
    isLoading: viewersLoading,
  } = useStoryAnalyticsViewers(storyId, Boolean(storyId));

  const funnelData = React.useMemo(() => {
    if (!data?.funnel) return [];
    return [
      { stage: 'Impressions', count: data.funnel.impressions },
      { stage: 'Views', count: data.funnel.views },
      { stage: 'Completed', count: data.funnel.completed },
      { stage: 'Replied', count: data.funnel.replied },
    ];
  }, [data]);

  const funnelBase = Math.max(1, data?.funnel?.impressions ?? 1);

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Story Insights"
        subtitle="Viewer funnel, hourly reach curve, navigation taps, and viewer list."
        period={period}
        onPeriodChange={setPeriod}
        backHref="/analytics/stories"
        backLabel="All stories analytics"
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
            Could not load analytics for this story.
          </div>
        ) : (
          <>
            <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center gap-3">
              {data.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={normalizeStorageUrl(data.thumbnailUrl)}
                  alt={data.preview}
                  className="w-12 h-14 rounded-lg object-cover border shrink-0 bg-muted"
                />
              ) : (
                <div className="w-12 h-14 rounded-lg border bg-muted/60 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-sm text-foreground line-clamp-2">
                  {data.preview || 'Story'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Posted {new Date(data.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as StoryDetailTab)}
              className="space-y-6"
            >
              <TabsList data-testid="story-analytics-tabs">
                <TabsTrigger value="overview" data-testid="story-tab-overview">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="retention" data-testid="story-tab-retention">
                  Retention
                </TabsTrigger>
                <TabsTrigger value="traffic" data-testid="story-tab-traffic">
                  Traffic
                </TabsTrigger>
                <TabsTrigger value="compare" data-testid="story-tab-compare">
                  Compare
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <AnalyticsStatCard label="Impressions" value={data.funnel?.impressions ?? data.totals.impressions} icon={Eye} />
                  <AnalyticsStatCard label="Unique Viewers" value={data.totals.uniqueViews} sublabel={`${data.totals.views} total views`} icon={Users} />
                  <AnalyticsStatCard label="Completed" value={data.totals.completions} icon={CheckCircle2} />
                  <AnalyticsStatCard label="Replies" value={data.totals.replies} sublabel={`${data.totals.exits} exits`} icon={MessageSquare} />
                </div>

                {/* Funnel + Hourly Timeline */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                    <div>
                      <h2 className="text-base font-semibold">Viewer Funnel</h2>
                      <p className="text-xs text-muted-foreground">
                        Conversion from story impression to view, completion, and reply
                      </p>
                    </div>

                    <div className="space-y-3" data-testid="story-viewer-funnel">
                      {funnelData.map((step) => {
                        const pct = Math.min(100, Math.round((step.count / funnelBase) * 100));
                        return (
                          <div key={step.stage} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground">{step.stage}</span>
                              <span className="text-muted-foreground">
                                {step.count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${step.count > 0 ? Math.max(4, pct) : 0}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                        <p className="font-semibold text-foreground">{data.totals.tapsForward}</p>
                        <p className="text-[11px] text-muted-foreground">Taps forward</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                        <p className="font-semibold text-foreground">{data.totals.tapsBack}</p>
                        <p className="text-[11px] text-muted-foreground">Taps back</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                        <p className="font-semibold text-foreground">{data.totals.exits}</p>
                        <p className="text-[11px] text-muted-foreground">Exits</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                    <div>
                      <h2 className="text-base font-semibold">Views Since Posting</h2>
                      <p className="text-xs text-muted-foreground">
                        Hourly distribution across the 24h story window
                      </p>
                    </div>
                    <AnalyticsBarChart
                      data={data.hourlyViews ?? []}
                      xKey="label"
                      bars={[{ dataKey: 'views', name: 'Views', color: '#8b5cf6' }]}
                      testId="story-hourly-timeline-chart"
                    />
                  </div>
                </div>

                {/* Author-only Viewers List (capped at 100) */}
                <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold">Viewers</h2>
                      <p className="text-xs text-muted-foreground">
                        Visible to story author only (up to 100 recent viewers)
                      </p>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {viewersData?.viewerCount ?? 0} total
                    </span>
                  </div>

                  {viewersLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 rounded-lg" />
                      ))}
                    </div>
                  ) : !viewersData || viewersData.viewers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No individual viewer records available (active 24h window may have expired).
                    </p>
                  ) : (
                    <div className="divide-y divide-border/50 max-h-96 overflow-y-auto" data-testid="story-viewers-list">
                      {viewersData.viewers.slice(0, 100).map((viewer) => {
                        const initials = (viewer.name || viewer.username || 'U')
                          .slice(0, 2)
                          .toUpperCase();
                        return (
                          <div
                            key={viewer.userId}
                            className="py-2.5 flex items-center justify-between gap-3"
                          >
                            <Link
                              href={`/${viewer.username}`}
                              className="flex items-center gap-2.5 min-w-0 group"
                            >
                              <Avatar className="w-8 h-8">
                                <AvatarImage
                                  src={viewer.avatarUrl ? normalizeStorageUrl(viewer.avatarUrl) : undefined}
                                  alt={viewer.username}
                                />
                                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate group-hover:underline">
                                  {viewer.name || viewer.username}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  @{viewer.username}
                                </p>
                              </div>
                            </Link>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {formatDistanceToNow(new Date(viewer.viewedAt), { addSuffix: true })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="retention" className="mt-0">
                <ContentRetentionPanel
                  contentType="story"
                  contentId={storyId}
                  enabled={activeTab === 'retention'}
                />
              </TabsContent>

              <TabsContent value="traffic" className="mt-0">
                <ContentTrafficPanel
                  contentType="story"
                  contentId={storyId}
                  enabled={activeTab === 'traffic'}
                />
              </TabsContent>

              <TabsContent value="compare" className="mt-0">
                <ContentComparePanel
                  contentType="story"
                  contentId={storyId}
                  enabled={activeTab === 'compare'}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
