'use client';

import * as React from 'react';
import { useComments } from '@/hooks/useComments';
import { CommentItem } from './CommentItem';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';
import type { Comment } from '@/lib/types';

interface CommentListProps {
  postId: string;
  postAuthorId: string;
  initialComments?: Comment[];
  className?: string;
}

export function CommentList({
  postId,
  postAuthorId,
  initialComments,
  className,
}: CommentListProps) {
  const { data: comments, isLoading } = useComments(postId);

  const displayComments = comments ?? initialComments ?? [];

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

  if (displayComments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-35" />
        <p className="text-xs">No comments yet. Be the first to reply!</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {displayComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          postAuthorId={postAuthorId}
        />
      ))}
    </div>
  );
}
