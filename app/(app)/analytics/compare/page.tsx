'use client';

import * as React from 'react';
import Link from 'next/link';
import { Award, Scale } from 'lucide-react';
import { useCrossContentCompare } from '@/hooks/useAnalytics';
import { AnalyticsHeader } from '@/components/analytics/analytics-shell';
import { AnalyticsBarChart } from '@/components/analytics/analytics-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AnalyticsContentType, AnalyticsPeriod } from '@/lib/types';

const WINNER_REASON_LABEL: Record<string, string> = {
  highest_engagement_rate: 'Highest Engagement Rate',
  most_reach: 'Most Reach',
  most_saves: 'Most Saves',
};

export default function CrossContentComparePage() {
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const [contentType, setContentType] = React.useState<AnalyticsContentType>('post');
  const [contentIds, setContentIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const ct = sp.get('contentType');
    if (ct === 'post' || ct === 'reel' || ct === 'story') {
      setContentType(ct);
    }
    const rawIds = sp.get('ids') ?? sp.get('contentIds') ?? '';
    const parsed = Array.from(
      new Set(
        rawIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    ).slice(0, 5);
    setContentIds(parsed);
  }, []);

  const { data, isLoading, isError } = useCrossContentCompare(
    contentType,
    contentIds,
    contentIds.length > 0
  );

  const chartData = React.useMemo(
    () =>
      (data?.items ?? []).map((item, idx) => ({
        name: item.preview ? item.preview.slice(0, 18) : `#${idx + 1}`,
        impressions: item.metrics.impressions,
        reach: item.metrics.reach,
        engagements: item.metrics.engagements,
      })),
    [data]
  );

  const backHref =
    contentType === 'reel'
      ? '/analytics/reels'
      : contentType === 'story'
        ? '/analytics/stories'
        : '/analytics/posts';

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Compare Content"
        subtitle={`Side-by-side comparison of selected ${contentType}s.`}
        period={period}
        onPeriodChange={setPeriod}
        backHref={backHref}
        backLabel={`Back to ${contentType}s analytics`}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {contentIds.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center space-y-3">
            <Scale className="w-8 h-8 mx-auto text-muted-foreground/60" />
            <h2 className="text-base font-semibold">Select items to compare</h2>
            <p className="text-xs text-muted-foreground">
              Choose 2 to 5 posts or reels from Creator Studio lists to inspect them side-by-side.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/analytics/posts">Go to Post Analytics</Link>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Unable to compare the selected {contentType}s.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((item) => {
                const isWinner = data.winner?.contentId === item.contentId;
                return (
                  <div
                    key={item.contentId}
                    data-testid={`compare-card-${item.contentId}`}
                    className={cn(
                      'rounded-xl border bg-card p-5 shadow-sm space-y-4',
                      isWinner && 'border-primary ring-1 ring-primary/30'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/analytics/${contentType}s/${item.contentId}`}
                        className="font-semibold text-sm hover:underline line-clamp-2"
                      >
                        {item.preview || `${contentType} #${item.contentId.slice(-6)}`}
                      </Link>
                      {isWinner && (
                        <Badge className="shrink-0 gap-1" data-testid="compare-winner-badge">
                          <Award className="w-3 h-3" />
                          Winner
                        </Badge>
                      )}
                    </div>

                    {isWinner && data.winner && (
                      <p className="text-xs text-primary font-medium">
                        {WINNER_REASON_LABEL[data.winner.why] ?? data.winner.why}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2.5 text-xs pt-2 border-t">
                      <div>
                        <p className="text-muted-foreground">Engagement Rate</p>
                        <p className="font-bold text-sm">
                          {(item.metrics.engagementRate * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Impressions</p>
                        <p className="font-bold text-sm">{item.metrics.impressions}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reach</p>
                        <p className="font-bold text-sm">{item.metrics.reach}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Engagements</p>
                        <p className="font-bold text-sm">{item.metrics.engagements}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Likes / Comments</p>
                        <p className="font-semibold">
                          {item.metrics.likes} / {item.metrics.comments}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Saves / Shares</p>
                        <p className="font-semibold">
                          {item.metrics.saves} / {item.metrics.shares}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-semibold">Side-by-Side Metrics</h2>
                <p className="text-xs text-muted-foreground">
                  Impressions, reach, and total engagements across compared items
                </p>
              </div>
              <AnalyticsBarChart
                data={chartData}
                xKey="name"
                bars={[
                  { dataKey: 'impressions', name: 'Impressions', color: '#6366f1' },
                  { dataKey: 'reach', name: 'Reach', color: '#14b8a6' },
                  { dataKey: 'engagements', name: 'Engagements', color: '#ec4899' },
                ]}
                testId="cross-compare-bar-chart"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
