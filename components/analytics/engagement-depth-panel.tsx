'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, Eye, Flame, MessageSquare, Sparkles, Users } from 'lucide-react';
import { useContentDepth } from '@/hooks/useAnalytics';
import { AnalyticsStatCard } from '@/components/analytics/analytics-shell';
import { CHART_PALETTE } from '@/components/analytics/analytics-charts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import type { AnalyticsContentType } from '@/lib/types';

export interface DiscussionTier {
  label: 'Low' | 'Medium' | 'High';
  badgeClass: string;
}

/**
 * Classifies discussionScore into Low (<5), Medium (5-20), or High (>20).
 */
export function getDiscussionTier(score: number): DiscussionTier {
  if (score > 20) {
    return {
      label: 'High',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    };
  }
  if (score >= 5) {
    return {
      label: 'Medium',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    };
  }
  return {
    label: 'Low',
    badgeClass: 'bg-muted text-muted-foreground border-border',
  };
}

/**
 * Renders the "Depth" analytics tab shared by Post and Reel detail analytics pages:
 * discussion score badge, horizontal engagement breakdown chart, top comment emojis,
 * and top commenters ranking (capped at 10).
 */
export function EngagementDepthPanel({
  contentType,
  contentId,
  enabled = true,
}: {
  contentType: AnalyticsContentType;
  contentId: string;
  enabled?: boolean;
}) {
  const { data, isLoading, isError } = useContentDepth(contentType, contentId, enabled);

  const breakdownRows = React.useMemo(() => {
    if (!data) return [];
    const b = data.engagements.breakdown;
    return [
      { key: 'like', label: 'Likes', count: b.like.count, uniqueUsers: b.like.uniqueUsers },
      { key: 'comment', label: 'Comments', count: b.comment.count, uniqueUsers: b.comment.uniqueUsers },
      { key: 'reply', label: 'Replies', count: b.reply.count, uniqueUsers: b.reply.uniqueUsers },
      { key: 'reaction', label: 'Reactions', count: b.reaction.count, uniqueUsers: b.reaction.uniqueUsers },
      { key: 'save', label: 'Saves', count: b.save.count, uniqueUsers: b.save.uniqueUsers },
      { key: 'share', label: 'Shares', count: b.share.count, uniqueUsers: b.share.uniqueUsers },
      { key: 'viewLong', label: 'Long Views', count: b.viewLong.count, uniqueUsers: b.viewLong.uniqueUsers },
    ];
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="depth-panel-loading">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Could not load engagement depth metrics for this {contentType}.
      </div>
    );
  }

  const tier = getDiscussionTier(data.discussionScore);
  const topEmojis = data.engagements.breakdown.reaction.topEmojis ?? [];
  const engagementRatePct = `${(data.engagementRate * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6" data-testid="engagement-depth-panel">
      {/* Summary KPIs + Discussion Score */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="col-span-2 lg:col-span-1 rounded-xl border bg-card p-4 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Discussion Score</span>
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xl font-bold tabular-nums" data-testid="discussion-score-value">
              {data.discussionScore.toFixed(1)}
            </span>
            <Badge
              variant="outline"
              className={cn('text-xs font-semibold', tier.badgeClass)}
              data-testid="discussion-score-badge"
            >
              {tier.label}
            </Badge>
          </div>
        </div>

        <AnalyticsStatCard
          label="Total Engagements"
          value={data.engagements.total}
          sublabel={`${data.engagements.unique} unique users`}
          icon={Activity}
        />
        <AnalyticsStatCard
          label="Engagement Rate"
          value={engagementRatePct}
          sublabel={`${data.impressions} impressions`}
          icon={Eye}
        />
        <AnalyticsStatCard
          label="Avg Depth / User"
          value={data.avgDepthPerUser.toFixed(2)}
          sublabel="events per engaged user"
          icon={Sparkles}
        />
        <AnalyticsStatCard
          label="Engaged Audience"
          value={data.uniqueEngagedUsers}
          sublabel={`${data.reach} reach`}
          icon={Users}
        />
      </div>

      {/* Breakdown Horizontal Bar Chart */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold">Engagement Depth Breakdown</h2>
          <p className="text-xs text-muted-foreground">
            Event volume across likes, comments, replies, comment reactions, saves, shares, and long views
          </p>
        </div>

        <div style={{ width: '100%', height: 280 }} data-testid="depth-breakdown-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={breakdownRows}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 16, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.45} horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={84}
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: unknown, _name: unknown, props: any) => {
                  const unique = props?.payload?.uniqueUsers ?? 0;
                  return [`${value} (${unique} unique)`, 'Events'];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: 'hsl(var(--popover-foreground))',
                }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {breakdownRows.map((row, index) => (
                  <Cell key={row.key} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Emojis */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4" data-testid="depth-top-emojis">
          <div>
            <h2 className="text-base font-semibold">Top Comment Reactions</h2>
            <p className="text-xs text-muted-foreground">
              Most frequent emojis reacted on comments for this {contentType}
            </p>
          </div>
          {topEmojis.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No comment reactions recorded yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topEmojis.map((entry) => (
                <div
                  key={entry.emoji}
                  data-testid={`depth-top-emoji-${entry.emoji}`}
                  className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-sm"
                >
                  <span className="text-base leading-none">{entry.emoji}</span>
                  <span className="font-semibold tabular-nums text-xs">{entry.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Commenters */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4" data-testid="depth-top-commenters">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Top Commenters</h2>
              <p className="text-xs text-muted-foreground">
                Most active participants in the discussion (up to 10)
              </p>
            </div>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </div>

          {data.topCommenters.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No comments recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {data.topCommenters.map((commenter) => {
                const initials = (commenter.name || commenter.username || 'U')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={commenter.userId}
                    className="py-2.5 flex items-center justify-between gap-3"
                    data-testid={`depth-top-commenter-${commenter.userId}`}
                  >
                    <Link
                      href={`/${commenter.username}`}
                      className="flex items-center gap-2.5 min-w-0 group"
                    >
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage
                          src={
                            commenter.avatarUrl
                              ? normalizeStorageUrl(commenter.avatarUrl)
                              : undefined
                          }
                          alt={commenter.username}
                        />
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:underline">
                          {commenter.name || commenter.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{commenter.username}
                        </p>
                      </div>
                    </Link>

                    <Badge variant="secondary" className="shrink-0 tabular-nums">
                      {commenter.commentCount}{' '}
                      {commenter.commentCount === 1 ? 'comment' : 'comments'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
