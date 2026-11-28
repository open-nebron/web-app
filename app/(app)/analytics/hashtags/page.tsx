'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Hash } from 'lucide-react';
import { useAnalyticsHashtags } from '@/hooks/useAnalytics';
import { AnalyticsHeader } from '@/components/analytics/analytics-shell';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AnalyticsPeriod } from '@/lib/types';

export default function HashtagsAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const { data, isLoading, isError } = useAnalyticsHashtags(period, 50);

  const rows = data?.hashtags ?? [];

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Hashtag Performance"
        subtitle="See which hashtags drive higher impressions, reach, and engagement vs your baseline."
        period={period}
        onPeriodChange={setPeriod}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Failed to load hashtag analytics.
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center space-y-2">
            <Hash className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <h2 className="text-base font-semibold">No hashtagged posts in this period</h2>
            <p className="text-xs text-muted-foreground">
              Add hashtags to posts to track tag performance against your creator baseline.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="analytics-hashtags-table">
                <thead className="bg-muted/40 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Hashtag</th>
                    <th className="px-3 py-3 text-right font-medium">Posts</th>
                    <th className="px-3 py-3 text-right font-medium">Impressions</th>
                    <th className="px-3 py-3 text-right font-medium">Reach</th>
                    <th className="px-3 py-3 text-right font-medium">Avg Likes</th>
                    <th className="px-3 py-3 text-right font-medium">Avg Comments</th>
                    <th className="px-3 py-3 text-right font-medium">Avg Eng. Rate</th>
                    <th className="px-4 py-3 text-right font-medium">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.map((row) => (
                    <tr
                      key={row.tag}
                      onClick={() => router.push(`/hashtag/${encodeURIComponent(row.tag)}`)}
                      data-testid={`analytics-hashtag-row-${row.tag}`}
                      className="hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-primary">#{row.tag}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.posts}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.impressions}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.reach}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.avgLikes.toFixed(1)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.avgComments.toFixed(1)}</td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums">
                        {(row.avgEngagementRate * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            'capitalize text-[11px]',
                            row.verdict === 'high' &&
                              'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                            row.verdict === 'low' &&
                              'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {row.verdict}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
