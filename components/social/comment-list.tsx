'use client';

import * as React from 'react';
import { useComments, type CommentSortOrder, type CommentTargetType } from '@/hooks/useComments';
import { CommentItem } from './comment-item';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import type { Comment } from '@/lib/types';

export interface CommentListProps {
  postId: string;
  postAuthorId: string;
  targetType?: CommentTargetType;
  initialComments?: Comment[];
  className?: string;
  showSortToggle?: boolean;
}

export function CommentList({
  postId,
  postAuthorId,
  targetType = 'post',
  initialComments,
  className,
  showSortToggle = true,
}: CommentListProps) {
  const [sort, setSort] = React.useState<CommentSortOrder>('top');
  const [expandedReplies, setExpandedReplies] = React.useState<Record<string, boolean>>({});
  const [replyingToId, setReplyingToId] = React.useState<string | null>(null);

  const { data: comments, isLoading } = useComments(postId, {
    targetType,
    sort,
  });

  const displayComments = comments ?? initialComments ?? [];

  const handleToggleExpand = React.useCallback((commentId: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  }, []);

  const handleExpandReplies = React.useCallback((commentId: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: true,
    }));
  }, []);

  const handleToggleReplyForm = React.useCallback((commentId: string) => {
    setReplyingToId((prev) => (prev === commentId ? null : commentId));
  }, []);

  const handleCloseReplyForm = React.useCallback(() => {
    setReplyingToId(null);
  }, []);

  if (isLoading && displayComments.length === 0) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 py-2">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {showSortToggle && displayComments.length > 0 && (
        <div className="flex items-center justify-end gap-1 pb-2 border-b border-border/40">
          <span className="text-[11px] text-muted-foreground mr-1">Sort:</span>
          {(['top', 'new'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSort(option)}
              data-testid={`comments-sort-${option}`}
              className={cn(
                'px-2 py-0.5 rounded text-xs font-medium transition-colors',
                sort === option
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {option === 'top' ? 'Top' : 'Newest'}
            </button>
          ))}
        </div>
      )}

      {displayComments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-35" />
          <p className="text-xs">No comments yet. Be the first to reply!</p>
        </div>
      ) : (
        <div>
          {displayComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postAuthorId={postAuthorId}
              targetId={postId}
              targetType={targetType}
              isExpanded={Boolean(expandedReplies[comment.id])}
              activeReplyTargetId={replyingToId}
              onToggleExpand={handleToggleExpand}
              onExpandReplies={handleExpandReplies}
              onToggleReplyForm={handleToggleReplyForm}
              onCloseReplyForm={handleCloseReplyForm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
