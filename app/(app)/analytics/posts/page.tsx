'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Scale } from 'lucide-react';
import { usePostAnalyticsList } from '@/hooks/useAnalytics';
import { AnalyticsHeader, formatShortDate } from '@/components/analytics/analytics-shell';
import {
  SortableColumnHeader,
  sortRowsByKey,
  type SortDirection,
} from '@/components/analytics/analytics-charts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { normalizeStorageUrl } from '@/lib/utils';
import type { AnalyticsPeriod, PostAnalyticsRow } from '@/lib/types';

type PostSortKey =
  | 'createdAt'
  | 'impressions'
  | 'reach'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves'
  | 'profileVisits'
  | 'newFollowers'
  | 'engagementRate';

export default function PostsAnalyticsPage() {
  const router = useRouter();
  const [period, setPeriod] = React.useState<AnalyticsPeriod>('30d');
  const [sortKey, setSortKey] = React.useState<PostSortKey>('impressions');
  const [sortDir, setSortDir] = React.useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) {
        toast({ title: 'Compare limit', description: 'Select up to 5 posts to compare.' });
        return prev;
      }
      return [...prev, id];
    });
  };

  const { data: rows, isLoading, isError } = usePostAnalyticsList(period, 50);

  const handleSort = (key: PostSortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedRows = React.useMemo(
    () => sortRowsByKey<PostAnalyticsRow>(rows ?? [], sortKey, sortDir),
    [rows, sortKey, sortDir]
  );

  return (
    <div className="pb-12">
      <AnalyticsHeader
        title="Post Analytics"
        subtitle="Compare impressions, reach, saves, and engagement rate across all posts."
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
            Failed to load post analytics.
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center space-y-2">
            <FileText className="w-8 h-8 mx-auto text-muted-foreground/50" />
            <h2 className="text-base font-semibold">No posts yet</h2>
            <p className="text-xs text-muted-foreground">
              Publish posts to track impressions, reach, saves, and engagement rates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedIds.length > 0 && (
              <div
                data-testid="posts-compare-bar"
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-2.5 shadow-sm text-xs"
              >
                <span className="font-medium text-foreground">
                  {selectedIds.length} post{selectedIds.length === 1 ? '' : 's'} selected
                  {selectedIds.length < 2 ? ' (select at least 2 to compare)' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                    Clear
                  </Button>
                  {selectedIds.length >= 2 && (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      data-testid="compare-selected-posts-btn"
                      onClick={() =>
                        router.push(
                          `/analytics/compare?contentType=post&ids=${selectedIds.join(',')}`
                        )
                      }
                    >
                      <Scale className="w-3.5 h-3.5" />
                      <span>Compare ({selectedIds.length})</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="analytics-posts-table">
                  <thead className="bg-muted/40 text-muted-foreground border-b">
                    <tr>
                      <th className="w-10 px-3 py-2.5 text-center font-medium">
                        <span className="sr-only">Compare</span>
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium min-w-[220px]">Post</th>
                    <SortableColumnHeader label="Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Impr." sortKey="impressions" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Reach" sortKey="reach" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Likes" sortKey="likes" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Comments" sortKey="comments" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Shares" sortKey="shares" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Saves" sortKey="saves" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Visits" sortKey="profileVisits" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Follows" sortKey="newFollowers" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableColumnHeader label="Eng. Rate" sortKey="engagementRate" activeKey={sortKey} direction={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sortedRows.map((row) => (
                    <tr
                      key={row.postId}
                      onClick={() => router.push(`/analytics/posts/${row.postId}`)}
                      data-testid={`analytics-post-row-${row.postId}`}
                      className="hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <td
                        className="px-3 py-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.postId)}
                          onChange={() => toggleSelect(row.postId)}
                          aria-label={`Select post ${row.postId} for comparison`}
                          data-testid={`compare-checkbox-post-${row.postId}`}
                          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {row.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={normalizeStorageUrl(row.thumbnailUrl)}
                              alt={row.preview}
                              className="w-10 h-10 rounded-md object-cover border shrink-0 bg-muted"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md border bg-muted/60 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-foreground line-clamp-2 max-w-[240px]">
                            {row.preview || 'Text post'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground whitespace-nowrap">
                        {formatShortDate(row.createdAt.slice(0, 10))}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">{row.impressions}</td>
                      <td className="px-3 py-3 text-right">{row.reach}</td>
                      <td className="px-3 py-3 text-right">{row.likes}</td>
                      <td className="px-3 py-3 text-right">{row.comments}</td>
                      <td className="px-3 py-3 text-right">{row.shares}</td>
                      <td className="px-3 py-3 text-right">{row.saves}</td>
                      <td className="px-3 py-3 text-right">{row.profileVisits}</td>
                      <td className="px-3 py-3 text-right">{row.newFollowers}</td>
                      <td className="px-3 py-3 text-right font-semibold text-primary">
                        {row.engagementRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
