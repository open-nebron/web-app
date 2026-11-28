'use client';

import * as React from 'react';
import type { CommentReactionSummary } from '@/lib/types';
import { useAuthStore } from '@/lib/auth-store';
import { useUser } from '@/hooks/use-user';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, normalizeStorageUrl } from '@/lib/utils';

export interface CommentReactionsProps {
  commentId: string;
  reactions?: CommentReactionSummary[];
  currentUserId?: string;
  disabled?: boolean;
  onToggle: (emoji: string, hasReacted: boolean) => void;
}

function CommentReactionUserRow({ userId }: { userId: string }) {
  const authUserId = useAuthStore((s) => s.user?.userId);
  const { data: user } = useUser(userId);
  const isSelf = authUserId === userId;
  const label = isSelf ? 'You' : user?.name || user?.username || 'Member';
  const avatarSrc = user?.avatarUrl ? normalizeStorageUrl(user.avatarUrl) : undefined;

  return (
    <div className="flex items-center gap-2 py-0.5">
      <Avatar className="w-4 h-4 shrink-0">
        <AvatarImage src={avatarSrc} />
        <AvatarFallback className="text-[8px] font-semibold">
          {(label[0] || 'U').toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate max-w-[140px] text-xs">{label}</span>
    </div>
  );
}

/**
 * Pill row displaying emoji reactions on a comment with a hover tooltip
 * listing up to 5 reactors and interactive click-to-toggle behavior.
 */
export function CommentReactions({
  commentId,
  reactions,
  currentUserId,
  disabled = false,
  onToggle,
}: CommentReactionsProps) {
  const authUserId = useAuthStore((s) => s.user?.userId);
  const activeUserId = currentUserId || authUserId;
  const visible = (reactions ?? []).filter((r) => r.count > 0);

  if (visible.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="mt-1.5 flex flex-wrap items-center gap-1.5"
        data-testid={`comment-reactions-row-${commentId}`}
        onClick={(e) => e.stopPropagation()}
      >
        {visible.map((reaction) => {
          const hasReacted = Boolean(activeUserId && reaction.userIds.includes(activeUserId));
          const previewUsers = reaction.userIds.slice(0, 5);
          const extraCount = Math.max(0, reaction.count - previewUsers.length);

          return (
            <Tooltip key={reaction.emoji}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(reaction.emoji, hasReacted)}
                  data-testid={`comment-reaction-pill-${commentId}-${reaction.emoji}`}
                  aria-pressed={hasReacted}
                  aria-label={`React with ${reaction.emoji} (${reaction.count})`}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
                    hasReacted
                      ? 'bg-primary/15 border-primary/50 text-primary font-medium'
                      : 'bg-muted/50 border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="text-sm leading-none">{reaction.emoji}</span>
                  <span className="tabular-nums text-[11px]">{reaction.count}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="p-2.5 max-w-[200px]"
                data-testid={`comment-reaction-tooltip-${commentId}-${reaction.emoji}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-border/50 text-xs font-semibold">
                    <span>{reaction.emoji}</span>
                    <span>
                      {reaction.count} {reaction.count === 1 ? 'reaction' : 'reactions'}
                    </span>
                  </div>
                  {previewUsers.map((uid) => (
                    <CommentReactionUserRow key={uid} userId={uid} />
                  ))}
                  {extraCount > 0 && (
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      and {extraCount} more
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
