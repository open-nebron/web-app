'use client';

import * as React from 'react';
import { Clock, ShieldCheck, TrendingDown, UserPlus, Users } from 'lucide-react';
import {
  useAnalyticsAudienceActivity,
  useAnalyticsAudienceGrowth,
  useAnalyticsAudienceSources,
  useAudienceAnalytics,
} from '@/hooks/useAnalytics';
import {
  AnalyticsHeader,
  AnalyticsStatCard,
  formatShortDate,
} from '@/components/analytics/analytics-shell';
import {
  AnalyticsBarChart,
  AnalyticsLineChart,
  TrafficSourcesPieChart,
} from '@/components/analytics/analytics-charts';
import { ActivityHeatmap } from '@/components/analytics/activity-heatmap';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { buildStackedFollowSourceSeries, FOLLOW_SOURCE_SERIES } from '@/lib/analytics-utils';
import { cn } from '@/lib/utils';
import type { AnalyticsPeriod } from '@/lib/types';

type AudienceTab = 'growth' | 'activity' | 'sources';
type GrowthGranularity = 'daily' | 'weekly' | 'monthly';

export default function AudienceAnalyticsPage() {
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const [activeTab, setActiveTab] = React.useState<AudienceTab>('growth');
  const [granularity, setGranularity] = React.useState<GrowthGranularity>('daily');

  const { data: legacyData, isLoading: legacyLoading, isError: legacyError } = useAudienceAnalytics(period);
  const { data: growthData, isLoading: growthLoading } = useAnalyticsAudienceGrowth(period);
  const { data: activityData, isLoading: activityLoading } = useAnalyticsAudienceActivity(
    period,
    activeTab === 'activity'
  );
  const { data: sourcesData, isLoading: sourcesLoading } = useAnalyticsAudienceSources(
    period,
    activeTab === 'sources'
  );

  const growthChartData = React.useMemo(() => {
    if (!growthData) {
      return (legacyData?.followerGrowth ?? []).map((g) => ({
        label: formatShortDate(g.date),
        gained: g.count,
        lost: 0,
        totalFollowers: g.count,
      }));
    }
    if (granularity === 'weekly') {
      return growthData.weekly.map((w) => ({
        label: formatShortDate(w.weekStart),
        totalFollowers: w.totalFollowers,
        gained: w.gained,
        lost: w.lost,
      }));
    }
    if (granularity === 'monthly') {
      return growthData.monthly.map((m) => ({
        label: m.monthStart.slice(0, 7),
        totalFollowers: m.totalFollowers,
        gained: m.gained,
        lost: m.lost,
      }));
    }
    return growthData.daily.map((d) => ({
      label: formatShortDate(d.date),
      totalFollowers: d.totalFollowers,
      gained: d.gained,
      lost: d.lost,
    }));
  }, [growthData, legacyData, granularity]);

  const activeHourData = React.useMemo(() => {
    const src =
      activityData?.byHour ??
      (legacyData?.activeHours ?? []).map((h) => ({ hour: h.hour, activeFollowers: h.followers }));
    return src.map((h) => ({
      hourLabel: `${String(h.hour).padStart(2, '0')}h`,
      activeFollowers: h.activeFollowers,
    }));
  }, [activityData, legacyData]);

  const dayOfWeekData = React.useMemo(
    () =>
      (activityData?.byDayOfWeek ?? []).map((d) => ({
        dayLabel: d.day.toUpperCase(),
        activeFollowers: d.activeFollowers,
      })),
    [activityData]
  );

  const sourcePieData = React.useMemo(() => {
    const src =
      sourcesData?.sources.map((s) => ({ source: s.source, count: s.newFollowers })) ??
      legacyData?.followSources ??
      [];
    return src
      .filter((s) => s.count > 0)
      .map((s) => ({
        name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
        value: s.count,
      }));
  }, [sourcesData, legacyData]);

  const stackedTrendData = React.useMemo(() => {
    const dates = (legacyData?.followerGrowth ?? []).map((g) => g.date);
    return buildStackedFollowSourceSeries(dates, sourcesData?.trend ?? []);
  }, [legacyData, sourcesData]);

  const totalGained = growthData
    ? growthData.daily.reduce((acc, g) => acc + g.gained, 0)
    : (legacyData?.followerGrowth ?? []).reduce((acc, g) => acc + g.count, 0);

  const isLoading = legacyLoading && growthLoading;

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Audience Insights"
        subtitle="Track follower growth rollups, active follower windows, and follow source attribution."
        period={period}
        onPeriodChange={setPeriod}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-72 rounded-xl" />
          </div>
        ) : legacyError && !growthData ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Unable to load audience analytics right now.
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as AudienceTab)}
            className="space-y-6"
          >
            <TabsList data-testid="audience-analytics-tabs">
              <TabsTrigger value="growth" data-testid="audience-tab-growth">
                Growth
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="audience-tab-activity">
                Activity
              </TabsTrigger>
              <TabsTrigger value="sources" data-testid="audience-tab-sources">
                Sources
              </TabsTrigger>
            </TabsList>

            {/* Growth Tab */}
            <TabsContent value="growth" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <AnalyticsStatCard
                  label={`Followers Gained (${period})`}
                  value={`+${totalGained}`}
                  icon={Users}
                  testId="audience-gained-card"
                />
                <AnalyticsStatCard
                  label="Weekly Churn Rate"
                  value={`${((growthData?.churnRate ?? 0) * 100).toFixed(2)}%`}
                  sublabel="Unfollows / followers per week"
                  icon={TrendingDown}
                  testId="audience-churn-card"
                />
                <AnalyticsStatCard
                  label="30-Day Retention"
                  value={`${((growthData?.retentionRate ?? 0) * 100).toFixed(1)}%`}
                  sublabel="Followers retained beyond 30 days"
                  icon={ShieldCheck}
                  testId="audience-retention-card"
                />
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold">Follower Growth & Retention</h2>
                    <p className="text-xs text-muted-foreground">
                      New followers gained vs unfollows and cumulative follower balance
                    </p>
                  </div>
                  <div className="inline-flex rounded-lg border bg-card p-0.5 text-xs">
                    {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGranularity(g)}
                        data-testid={`growth-granularity-${g}`}
                        className={cn(
                          'px-2.5 py-1 rounded-md capitalize transition-colors',
                          granularity === g
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <AnalyticsLineChart
                  data={growthChartData}
                  xKey="label"
                  series={[
                    { dataKey: 'totalFollowers', name: 'Total Followers', color: '#6366f1' },
                    { dataKey: 'gained', name: 'Gained', color: '#14b8a6' },
                    { dataKey: 'lost', name: 'Lost', color: '#ec4899' },
                  ]}
                  testId="audience-growth-chart"
                />
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-6 mt-0">
              {activityLoading ? (
                <Skeleton className="h-72 rounded-xl" />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AnalyticsStatCard
                      label="Peak Follower Window"
                      value={
                        activityData?.peakWindow && activityData.peakWindow.totalActive > 0
                          ? `${String(activityData.peakWindow.startHour).padStart(2, '0')}:00–${String(activityData.peakWindow.endHour).padStart(2, '0')}:00 UTC`
                          : '—'
                      }
                      sublabel={
                        activityData?.peakWindow
                          ? `${activityData.peakWindow.totalActive} active followers in window`
                          : 'No recent activity'
                      }
                      icon={Clock}
                      testId="audience-peak-window-card"
                    />
                    <AnalyticsStatCard
                      label="Active Followers Tracked"
                      value={activityData?.byDayOfWeek.reduce((m, d) => Math.max(m, d.activeFollowers), 0) ?? 0}
                      sublabel="Peak daily unique followers interacting"
                      icon={Users}
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                      <div>
                        <h2 className="text-base font-semibold">Active Hours (24h UTC)</h2>
                        <p className="text-xs text-muted-foreground">
                          Unique followers active by hour of day
                        </p>
                      </div>
                      <AnalyticsBarChart
                        data={activeHourData}
                        xKey="hourLabel"
                        bars={[{ dataKey: 'activeFollowers', name: 'Active Followers', color: '#14b8a6' }]}
                        testId="audience-active-hours-chart"
                      />
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                      <div>
                        <h2 className="text-base font-semibold">Activity by Day of Week</h2>
                        <p className="text-xs text-muted-foreground">
                          Active followers engaging across Monday–Sunday
                        </p>
                      </div>
                      <AnalyticsBarChart
                        data={dayOfWeekData}
                        xKey="dayLabel"
                        bars={[{ dataKey: 'activeFollowers', name: 'Active Followers', color: '#6366f1' }]}
                        testId="audience-day-of-week-chart"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                    <div>
                      <h2 className="text-base font-semibold">Audience Activity Heatmap</h2>
                      <p className="text-xs text-muted-foreground">
                        Weekly distribution across all 7 days and 24 hours
                      </p>
                    </div>
                    <ActivityHeatmap matrix={legacyData?.activityHeatmap} unitLabel="followers" />
                  </div>
                </>
              )}
            </TabsContent>

            {/* Sources Tab */}
            <TabsContent value="sources" className="space-y-6 mt-0">
              {sourcesLoading ? (
                <Skeleton className="h-72 rounded-xl" />
              ) : (
                <>
                  <AnalyticsStatCard
                    label="Top Follow Attribution Source"
                    value={sourcesData?.topSource ?? legacyData?.followSources?.[0]?.source ?? '—'}
                    sublabel="Primary surface driving new follows"
                    icon={UserPlus}
                    testId="audience-top-source-card"
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm space-y-4">
                      <div>
                        <h2 className="text-base font-semibold">Follow Sources Over Time</h2>
                        <p className="text-xs text-muted-foreground">
                          Daily stacked breakdown by profile, feed, reel, search, suggestion, and other
                        </p>
                      </div>
                      <AnalyticsBarChart
                        data={stackedTrendData}
                        xKey="label"
                        bars={FOLLOW_SOURCE_SERIES}
                        testId="audience-sources-stacked-chart"
                      />
                    </div>

                    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                      <div>
                        <h2 className="text-base font-semibold">Source Share</h2>
                        <p className="text-xs text-muted-foreground">
                          Total new follows per attribution source
                        </p>
                      </div>
                      <TrafficSourcesPieChart
                        data={sourcePieData}
                        emptyText="No attributed follows recorded in this period."
                        testId="audience-follow-sources-chart"
                      />
                      {(sourcesData?.sources ?? []).length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t text-xs" data-testid="audience-follow-sources-list">
                          {sourcesData!.sources.map((s) => (
                            <div key={s.source} className="flex items-center justify-between">
                              <span className="capitalize text-muted-foreground">{s.source}</span>
                              <span className="font-semibold text-foreground">{s.newFollowers}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
