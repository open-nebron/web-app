'use client';

import * as React from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Flame,
  Gauge,
  Minus,
  Timer,
  TrendingDown,
} from 'lucide-react';
import {
  useAnalyticsCompare,
  useAnalyticsCurve,
  useAnalyticsDecay,
  useAnalyticsSpeed,
  useAnalyticsTraffic,
} from '@/hooks/useAnalytics';
import { AnalyticsStatCard, formatDuration } from '@/components/analytics/analytics-shell';
import {
  AnalyticsBarChart,
  AnalyticsLineChart,
  TrafficSourcesPieChart,
} from '@/components/analytics/analytics-charts';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AnalyticsContentType, CompareAgainst } from '@/lib/types';

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

function PanelError({ label }: { label: string }) {
  return (
    <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
      Unable to load {label} metrics right now.
    </div>
  );
}

/**
 * Retention / completion curve panel:
 * renders 10% drop-off curve for reels/stories or 7-day hourly timeline for posts.
 */
export function ContentRetentionPanel({
  contentType,
  contentId,
  enabled = true,
}: {
  contentType: AnalyticsContentType;
  contentId: string;
  enabled?: boolean;
}) {
  const { data, isLoading, isError } = useAnalyticsCurve(contentType, contentId, enabled);

  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError label="retention curve" />;

  if (contentType === 'post') {
    const chartData = (data.timeline ?? []).map((pt) => ({
      hourLabel: `${pt.hoursAfter}h`,
      engagements: pt.engagements,
    }));
    const peakHour = (data.timeline ?? []).reduce(
      (best, pt) => (pt.engagements > best.engagements ? pt : best),
      { hoursAfter: 0, engagements: 0 }
    );
    const total = (data.timeline ?? []).reduce((s, p) => s + p.engagements, 0);

    return (
      <div className="space-y-6" data-testid="retention-panel-post">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <AnalyticsStatCard label="7d Tracked Engagements" value={total} icon={Activity} />
          <AnalyticsStatCard
            label="Peak Hour After Post"
            value={`+${peakHour.hoursAfter}h`}
            sublabel={`${peakHour.engagements} engagements`}
            icon={Clock}
          />
          <AnalyticsStatCard label="Horizon" value="168h (7 days)" icon={Timer} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-semibold">7-Day Hourly Engagement Curve</h2>
            <p className="text-xs text-muted-foreground">
              Engagement velocity across the first 168 hours since publish
            </p>
          </div>
          <AnalyticsLineChart
            data={chartData}
            xKey="hourLabel"
            series={[{ dataKey: 'engagements', name: 'Engagements', color: '#6366f1' }]}
            testId="post-retention-timeline-chart"
          />
        </div>
      </div>
    );
  }

  const curveData = (data.curve ?? []).map((pt) => ({
    label: `${pt.percent}%`,
    viewers: pt.viewers,
  }));

  return (
    <div className="space-y-6" data-testid={`retention-panel-${contentType}`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <AnalyticsStatCard label="Total Views" value={data.totalViews ?? 0} icon={Activity} />
        <AnalyticsStatCard
          label="Avg Watched %"
          value={`${(data.avgWatchedPercent ?? 0).toFixed(1)}%`}
          icon={Gauge}
        />
        <AnalyticsStatCard
          label="Avg Watch Time"
          value={formatDuration(data.avgWatchSeconds ?? 0)}
          icon={Clock}
        />
        <AnalyticsStatCard
          label="Completion Rate"
          value={`${((data.completionRate ?? 0) * 100).toFixed(1)}%`}
          sublabel={`${data.completions ?? 0} completions`}
          icon={Flame}
        />
      </div>

      {contentType === 'story' && (
        <div className="grid grid-cols-3 gap-3" data-testid="story-navigation-metrics">
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-xl font-bold tabular-nums">{data.tapsForward ?? 0}</p>
            <p className="text-xs text-muted-foreground">Taps Forward</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-xl font-bold tabular-nums">{data.tapsBack ?? 0}</p>
            <p className="text-xs text-muted-foreground">Taps Back</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center">
            <p className="text-xl font-bold tabular-nums">{data.exits ?? 0}</p>
            <p className="text-xs text-muted-foreground">Exits</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold">Audience Retention Drop-Off Curve</h2>
          <p className="text-xs text-muted-foreground">
            Viewers still watching at every 10% completion checkpoint (0% to 100%)
          </p>
        </div>
        <AnalyticsLineChart
          data={curveData}
          xKey="label"
          series={[{ dataKey: 'viewers', name: 'Viewers Remaining', color: '#6366f1' }]}
          testId={`${contentType}-dropoff-curve-chart`}
        />
      </div>
    </div>
  );
}

/**
 * Traffic source attribution panel showing Pie chart and per-source impression/engagement breakdown.
 */
export function ContentTrafficPanel({
  contentType,
  contentId,
  enabled = true,
}: {
  contentType: AnalyticsContentType;
  contentId: string;
  enabled?: boolean;
}) {
  const { data, isLoading, isError } = useAnalyticsTraffic(contentType, contentId, enabled);

  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError label="traffic attribution" />;

  const pieData = data.sources
    .filter((s) => s.impressions > 0)
    .map((s) => ({
      name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
      value: s.impressions,
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="traffic-attribution-panel">
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Discovery Sources</h2>
            <p className="text-xs text-muted-foreground">
              {data.totalImpressions} total impressions recorded
            </p>
          </div>
          {data.topSource && (
            <Badge variant="secondary" data-testid="traffic-top-source">
              Top: {data.topSource}
            </Badge>
          )}
        </div>
        <TrafficSourcesPieChart data={pieData} testId="content-traffic-pie-chart" />
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold">Source Performance Breakdown</h2>
          <p className="text-xs text-muted-foreground">
            Impressions, attributed engagements, and conversion rate by surface
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="py-2 text-left font-medium">Source</th>
                <th className="py-2 text-right font-medium">Impressions</th>
                <th className="py-2 text-right font-medium">Engagements</th>
                <th className="py-2 text-right font-medium">Eng. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.sources.map((row) => (
                <tr key={row.source}>
                  <td className="py-2.5 capitalize font-medium">{row.source}</td>
                  <td className="py-2.5 text-right tabular-nums">{row.impressions}</td>
                  <td className="py-2.5 text-right tabular-nums">{row.engagements}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">
                    {(row.engagementRate * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Cohort comparison panel comparing current content against previous_post, 7d_ago, or 30d_ago.
 */
export function ContentComparePanel({
  contentType,
  contentId,
  enabled = true,
}: {
  contentType: AnalyticsContentType;
  contentId: string;
  enabled?: boolean;
}) {
  const [against, setAgainst] = React.useState<CompareAgainst>('previous_post');
  const { data, isLoading, isError } = useAnalyticsCompare(contentType, contentId, against, enabled);

  const deltaBadge = (delta: number) => {
    const positive = delta > 0;
    const negative = delta < 0;
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums',
          positive && 'text-emerald-600 dark:text-emerald-400',
          negative && 'text-rose-600 dark:text-rose-400',
          !positive && !negative && 'text-muted-foreground'
        )}
      >
        {positive ? (
          <ArrowUpRight className="w-3.5 h-3.5" />
        ) : negative ? (
          <ArrowDownRight className="w-3.5 h-3.5" />
        ) : (
          <Minus className="w-3 h-3" />
        )}
        {positive ? `+${delta}%` : `${delta}%`}
      </span>
    );
  };

  return (
    <div className="space-y-5" data-testid="cohort-compare-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Cohort Comparison</h2>
          <p className="text-xs text-muted-foreground">
            Benchmark against your own historical {contentType}s
          </p>
        </div>

        <div className="inline-flex rounded-lg border bg-card p-1 gap-1">
          {(
            [
              { value: 'previous_post', label: `Previous ${contentType}` },
              { value: '7d_ago', label: '7d ago' },
              { value: '30d_ago', label: '30d ago' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAgainst(opt.value)}
              data-testid={`compare-against-${opt.value}`}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                against === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <PanelSkeleton />
      ) : isError || !data ? (
        <PanelError label="cohort comparison" />
      ) : !data.comparison || !data.deltas ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No earlier {contentType} available to compare against for this baseline.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border bg-card p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground" data-testid="cohort-summary-text">
                This {contentType} performed{' '}
                <span className="text-primary">
                  {Math.abs(data.deltas.engagementRate)}%{' '}
                  {data.verdict === 'better'
                    ? 'better'
                    : data.verdict === 'worse'
                      ? 'lower'
                      : 'similar'}
                </span>{' '}
                on engagement rate vs your comparison {contentType}.
              </p>
              <p className="text-xs text-muted-foreground">
                Baseline published {new Date(data.comparison.createdAt).toLocaleDateString()} — &ldquo;
                {data.comparison.preview || contentType}&rdquo;
              </p>
            </div>
            <Badge
              variant="outline"
              data-testid="cohort-verdict-badge"
              className={cn(
                'capitalize',
                data.verdict === 'better' &&
                  'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                data.verdict === 'worse' &&
                  'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              )}
            >
              {data.verdict}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { label: 'Impressions', curr: data.current.impressions, prev: data.comparison.impressions, d: data.deltas.impressions },
                { label: 'Engagements', curr: data.current.engagements, prev: data.comparison.engagements, d: data.deltas.engagements },
                { label: 'Likes', curr: data.current.likes, prev: data.comparison.likes, d: data.deltas.likes },
                { label: 'Saves', curr: data.current.saves, prev: data.comparison.saves, d: data.deltas.saves },
              ] as const
            ).map((m) => (
              <div key={m.label} className="rounded-xl border bg-card p-4 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{m.label}</span>
                  {deltaBadge(m.d)}
                </div>
                <p className="text-2xl font-bold tabular-nums">{m.curr}</p>
                <p className="text-[11px] text-muted-foreground">Baseline: {m.prev}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Engagement velocity gauge displaying time-to-first-engagement and half-life metrics.
 */
export function ContentSpeedPanel({
  contentType,
  contentId,
  enabled = true,
}: {
  contentType: AnalyticsContentType;
  contentId: string;
  enabled?: boolean;
}) {
  const { data, isLoading, isError } = useAnalyticsSpeed(contentType, contentId, enabled);

  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError label="engagement velocity" />;

  const pctMap: Record<typeof data.speedRating, number> = {
    viral: 100,
    fast: 78,
    average: 52,
    slow: 28,
    no_engagement: 0,
  };
  const ratingColor: Record<typeof data.speedRating, string> = {
    viral: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    fast: 'text-primary border-primary/40 bg-primary/10',
    average: 'text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10',
    slow: 'text-muted-foreground border-border bg-muted/40',
    no_engagement: 'text-muted-foreground border-border bg-muted/40',
  };

  return (
    <div className="space-y-6" data-testid="speed-panel">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Engagement Velocity Gauge</h2>
            <p className="text-xs text-muted-foreground">
              How fast your audience reacted after publish
            </p>
          </div>
          <Badge variant="outline" className={cn('capitalize', ratingColor[data.speedRating])}>
            {data.speedRating.replace('_', ' ')}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Slow</span>
            <span>Average (&lt;6h)</span>
            <span>Fast (&lt;30m)</span>
            <span>Viral (&lt;5m)</span>
          </div>
          <div className="h-3.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pctMap[data.speedRating]}%` }}
              data-testid="speed-gauge-bar"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <AnalyticsStatCard
            label="Time to First Engagement"
            value={
              data.timeToFirstEngagement !== null
                ? formatDuration(data.timeToFirstEngagement)
                : 'No engagement yet'
            }
            sublabel={
              data.firstEngagementType
                ? `First action: ${data.firstEngagementType}`
                : 'Waiting for first interaction'
            }
            icon={Timer}
          />
          <AnalyticsStatCard
            label="50% Engagement Half-Life"
            value={data.halfLifeHours !== null ? `${data.halfLifeHours}h` : '—'}
            sublabel={
              data.halfLifeHours !== null
                ? `Reached half its engagement in ${data.halfLifeHours} hours`
                : 'Not yet reached'
            }
            icon={Gauge}
          />
          <AnalyticsStatCard
            label="Published At"
            value={new Date(data.postedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            sublabel={new Date(data.postedAt).toLocaleDateString()}
            icon={Clock}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Engagement decay bar chart across age buckets (0-6h through 48-168h).
 */
export function ContentDecayPanel({
  contentType,
  contentId,
  enabled = true,
}: {
  contentType: AnalyticsContentType;
  contentId: string;
  enabled?: boolean;
}) {
  const { data, isLoading, isError } = useAnalyticsDecay(contentType, contentId, enabled);

  if (isLoading) return <PanelSkeleton />;
  if (isError || !data) return <PanelError label="content decay" />;

  const chartData = data.buckets.map((b) => ({
    ageLabel: `${b.ageHours}h`,
    engagements: b.engagements,
    pctOfPeak: Math.round(b.rateVsPeak * 100),
  }));

  return (
    <div className="space-y-6" data-testid="decay-panel">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <AnalyticsStatCard label="Peak Window" value={`${data.peakBucket}h`} icon={Flame} />
        <AnalyticsStatCard
          label="Decay Half-Life"
          value={`${data.halfLifeHours}h`}
          sublabel="Hours from peak to <=50% volume"
          icon={TrendingDown}
        />
        <AnalyticsStatCard
          label="Peak Engagements"
          value={Math.max(...data.buckets.map((b) => b.engagements), 0)}
          icon={Activity}
        />
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold">Content Decay Curve</h2>
          <p className="text-xs text-muted-foreground">
            Engagement drop-off across lifecycle age windows since publish
          </p>
        </div>
        <AnalyticsBarChart
          data={chartData}
          xKey="ageLabel"
          bars={[{ dataKey: 'engagements', name: 'Engagements', color: '#8b5cf6' }]}
          testId="content-decay-bar-chart"
        />
      </div>
    </div>
  );
}
