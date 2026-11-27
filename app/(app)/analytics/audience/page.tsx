'use client';

import * as React from 'react';
import { Clock, UserPlus, Users } from 'lucide-react';
import { useAudienceAnalytics } from '@/hooks/useAnalytics';
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
import type { AnalyticsPeriod } from '@/lib/types';

export default function AudienceAnalyticsPage() {
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const { data, isLoading, isError } = useAudienceAnalytics(period);

  const growthData = React.useMemo(
    () =>
      (data?.followerGrowth ?? []).map((g) => ({
        ...g,
        label: formatShortDate(g.date),
      })),
    [data]
  );

  const activeHourData = React.useMemo(
    () =>
      (data?.activeHours ?? []).map((h) => ({
        hourLabel: `${String(h.hour).padStart(2, '0')}h`,
        followers: h.followers,
      })),
    [data]
  );

  const sourcePieData = React.useMemo(
    () =>
      (data?.followSources ?? []).map((s) => ({
        name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
        value: s.count,
      })),
    [data]
  );

  const totalGained = growthData.reduce((acc, g) => acc + g.count, 0);
  const peakHour = React.useMemo(() => {
    const list = data?.activeHours ?? [];
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) => b.followers - a.followers || a.hour - b.hour);
    return sorted[0].followers > 0 ? sorted[0] : null;
  }, [data]);
  const topSource = data?.followSources?.[0];

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Audience Insights"
        subtitle="Understand follower growth, peak activity hours, and where new followers find you."
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
        ) : isError || !data ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Unable to load audience analytics right now.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <AnalyticsStatCard
                label={`Followers Gained (${period})`}
                value={`+${totalGained}`}
                icon={Users}
                testId="audience-gained-card"
              />
              <AnalyticsStatCard
                label="Peak Active Hour"
                value={peakHour ? `${String(peakHour.hour).padStart(2, '0')}:00 UTC` : '—'}
                sublabel={peakHour ? `${peakHour.followers} active followers` : 'No views recorded'}
                icon={Clock}
                testId="audience-peak-hour-card"
              />
              <AnalyticsStatCard
                label="Top Follow Source"
                value={topSource ? topSource.source : '—'}
                sublabel={topSource ? `${topSource.count} new follows` : 'No follow sources yet'}
                icon={UserPlus}
                testId="audience-top-source-card"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Follower Growth Over Time</h2>
                  <p className="text-xs text-muted-foreground">Daily new followers gained</p>
                </div>
                <AnalyticsLineChart
                  data={growthData}
                  xKey="label"
                  series={[{ dataKey: 'count', name: 'New Followers', color: '#6366f1' }]}
                  testId="audience-growth-chart"
                />
              </div>

              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-semibold">Follow Sources</h2>
                  <p className="text-xs text-muted-foreground">
                    Attribution via surface (`feed`, `reel`, `profile`, `search`, `suggestion`)
                  </p>
                </div>
                <TrafficSourcesPieChart
                  data={sourcePieData}
                  emptyText="No attributed follows recorded in this period."
                  testId="audience-follow-sources-chart"
                />
                {data.followSources.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t text-xs" data-testid="audience-follow-sources-list">
                    {data.followSources.map((s) => (
                      <div key={s.source} className="flex items-center justify-between">
                        <span className="capitalize text-muted-foreground">{s.source}</span>
                        <span className="font-semibold text-foreground">{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

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
                bars={[{ dataKey: 'followers', name: 'Active Followers', color: '#14b8a6' }]}
                testId="audience-active-hours-chart"
              />
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-semibold">Audience Activity Heatmap</h2>
                <p className="text-xs text-muted-foreground">
                  Weekly distribution across all 7 days and 24 hours
                </p>
              </div>
              <ActivityHeatmap matrix={data.activityHeatmap} unitLabel="followers" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
