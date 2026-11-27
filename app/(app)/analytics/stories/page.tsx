'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Radio } from 'lucide-react';
import { useStoryAnalyticsList } from '@/hooks/useAnalytics';
import { AnalyticsHeader, formatShortDate } from '@/components/analytics/analytics-shell';
import {
  SortableColumnHeader,
  sortRowsByKey,
  type SortDirection,
} from '@/components/analytics/analytics-charts';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeStorageUrl } from '@/lib/utils';
import type { AnalyticsPeriod, StoryAnalyticsRow } from '@/lib/types';

type StorySortKey =
  | 'createdAt'
  | 'uniqueViewers'
  | 'totalViews'
  | 'completionRate'
  | 'tapsForward'
  | 'tapsBack'
  | 'exits'
  | 'replies';

export default function StoriesAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const [sortKey, setSortKey] = React.useState<StorySortKey>('createdAt');
  const [sortDir, setSortDir] = React.useState<SortDirection>('desc');

  const { data: rows, isLoading, isError } = useStoryAnalyticsList(period, 50);

  const handleSort = (key: StorySortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedRows = React.useMemo(
    () => sortRowsByKey<StoryAnalyticsRow>(rows ?? [], sortKey, sortDir),
    [rows, sortKey, sortDir]
  );

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Story Analytics"
        subtitle="Track viewers, completion rates, taps forward/back, exits, and replies."
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
            Failed to load story analytics.
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center space-y-2">
            <Radio className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <h2 className="text-base font-semibold">No stories in this period</h2>
            <p className="text-xs text-muted-foreground">
              Share stories to monitor completion rate, navigation taps, exits, and viewer insights.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="analytics-stories-table">
                <thead className="bg-muted/40 text-muted-foreground border-b">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium min-w-[200px]">Story</th>
                    <SortableColumnHeader label="Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Viewers" sortKey="uniqueViewers" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Views" sortKey="totalViews" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Completion" sortKey="completionRate" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Taps Fwd" sortKey="tapsForward" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Taps Back" sortKey="tapsBack" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Exits" sortKey="exits" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Replies" sortKey="replies" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedRows.map((row) => (
                    <tr
                      key={row.storyId}
                      onClick={() => router.push(`/analytics/stories/${row.storyId}`)}
                      data-testid={`analytics-story-row-${row.storyId}`}
                      className="hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {row.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={normalizeStorageUrl(row.thumbnailUrl)}
                              alt={row.preview}
                              className="w-10 h-12 rounded-md object-cover border shrink-0 bg-muted"
                            />
                          ) : (
                            <div className="w-10 h-12 rounded-md border bg-muted/60 flex items-center justify-center shrink-0">
                              <Radio className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-foreground line-clamp-2 max-w-[220px]">
                            {row.preview || 'Story'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">
                        {formatShortDate(row.createdAt.slice(0, 10))}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{row.uniqueViewers}</td>
                      <td className="px-3 py-3 text-right">{row.totalViews}</td>
                      <td className="px-3 py-3 text-right font-medium text-primary">
                        {row.completionRate}%
                      </td>
                      <td className="px-3 py-3 text-right">{row.tapsForward}</td>
                      <td className="px-3 py-3 text-right">{row.tapsBack}</td>
                      <td className="px-3 py-3 text-right">{row.exits}</td>
                      <td className="px-3 py-3 text-right">{row.replies}</td>
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
