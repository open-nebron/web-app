'use client';

import * as React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/use-profile';
import { useDeleteComment } from '@/hooks/useComments';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import type { Comment } from '@/lib/types';
import { Trash2 } from 'lucide-react';

interface CommentItemProps {
  comment: Comment;
  postAuthorId: string;
  className?: string;
}

export function CommentItem({ comment, postAuthorId, className }: CommentItemProps) {
  const { data: myProfile } = useProfile();
  const deleteMutation = useDeleteComment(comment.postId);

  const isCommentAuthor = myProfile?.userId === comment.author.userId;
  const isPostAuthor = myProfile?.userId === postAuthorId;
  const canDelete = isCommentAuthor || isPostAuthor;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this comment?')) return;
    deleteMutation.mutate(comment.id);
  };

  const authorInitials = (comment.author.name || comment.author.username || 'U')
    .slice(0, 2)
    .toUpperCase();

  const timeAgo = React.useMemo(() => {
    try {
      return formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true });
    } catch {
      return '';
    }
  }, [comment.createdAt]);

  return (
    <div className={cn('flex gap-3 py-3 border-b border-border/40 last:border-b-0', className)}>
      <Link
        href={`/${comment.author.username}`}
        className="shrink-0 group"
      >
        <Avatar className="w-8 h-8 transition-opacity group-hover:opacity-85">
          <AvatarImage
            src={comment.author.avatarUrl ? normalizeStorageUrl(comment.author.avatarUrl) : undefined}
            alt={comment.author.username}
          />
          <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
        </Avatar>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <Link
              href={`/${comment.author.username}`}
              className="font-medium text-xs hover:underline truncate"
            >
              {comment.author.name || comment.author.username}
            </Link>
            <span className="text-xs text-muted-foreground truncate">
              @{comment.author.username}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <time
              dateTime={comment.createdAt}
              className="text-xs text-muted-foreground whitespace-nowrap"
            >
              {timeAgo}
            </time>
          </div>

          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="sr-only">Delete comment</span>
            </Button>
          )}
        </div>

        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
          {comment.body}
        </p>
      </div>
    </div>
  );
}
