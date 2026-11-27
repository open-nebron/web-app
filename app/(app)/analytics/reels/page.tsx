'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Film } from 'lucide-react';
import { useReelAnalyticsList } from '@/hooks/useAnalytics';
import { AnalyticsHeader, formatDuration } from '@/components/analytics/analytics-shell';
import {
  SortableColumnHeader,
  sortRowsByKey,
  type SortDirection,
} from '@/components/analytics/analytics-charts';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeStorageUrl } from '@/lib/utils';
import type { AnalyticsPeriod, ReelAnalyticsRow } from '@/lib/types';

type ReelSortKey =
  | 'createdAt'
  | 'views'
  | 'uniqueViews'
  | 'avgWatchSeconds'
  | 'completionRate'
  | 'replays'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'newFollowers';

export default function ReelsAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const [sortKey, setSortKey] = React.useState<ReelSortKey>('views');
  const [sortDir, setSortDir] = React.useState<SortDirection>('desc');

  const { data: rows, isLoading, isError } = useReelAnalyticsList(period, 50);

  const handleSort = (key: ReelSortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedRows = React.useMemo(
    () => sortRowsByKey<ReelAnalyticsRow>(rows ?? [], sortKey, sortDir),
    [rows, sortKey, sortDir]
  );

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Reel Analytics"
        subtitle="Inspect views, watch time, completion rates, replays, and follows per reel."
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
            Failed to load reel analytics.
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center space-y-2">
            <Film className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <h2 className="text-base font-semibold">No reels yet</h2>
            <p className="text-xs text-muted-foreground">
              Upload reels to see watch duration, drop-off curves, replays, and saves.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="analytics-reels-table">
                <thead className="bg-muted/40 text-muted-foreground border-b">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-medium min-w-[200px]">Reel</th>
                    <SortableColumnHeader label="Views" sortKey="views" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Unique" sortKey="uniqueViews" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Avg Watch" sortKey="avgWatchSeconds" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Completion" sortKey="completionRate" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Replays" sortKey="replays" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Likes" sortKey="likes" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Comments" sortKey="comments" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Shares" sortKey="shares" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Saves" sortKey="saves" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Follows" sortKey="newFollowers" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedRows.map((row) => (
                    <tr
                      key={row.reelId}
                      onClick={() => router.push(`/analytics/reels/${row.reelId}`)}
                      data-testid={`analytics-reel-row-${row.reelId}`}
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
                              <Film className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-foreground line-clamp-2 max-w-[220px]">
                            {row.preview || 'Reel'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">{row.views}</td>
                      <td className="px-3 py-3 text-right">{row.uniqueViews}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        {formatDuration(row.avgWatchSeconds)}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-primary">
                        {row.completionRate}%
                      </td>
                      <td className="px-3 py-3 text-right">{row.replays}</td>
                      <td className="px-3 py-3 text-right">{row.likes}</td>
                      <td className="px-3 py-3 text-right">{row.comments}</td>
                      <td className="px-3 py-3 text-right">{row.shares}</td>
                      <td className="px-3 py-3 text-right">{row.saves}</td>
                      <td className="px-3 py-3 text-right">{row.newFollowers}</td>
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
