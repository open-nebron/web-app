'use client';

import * as React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/use-profile';
import {
  useCommentReplies,
  useDeleteComment,
  useToggleCommentLike,
  type CommentTargetType,
} from '@/hooks/useComments';
import { ReplyComposer } from './reply-composer';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import type { Comment } from '@/lib/types';
import {
  Trash2,
  Flag,
  Heart,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { ReportDialog } from '@/components/reports/ReportDialog';

export interface CommentItemProps {
  comment: Comment;
  postAuthorId: string;
  targetId?: string;
  targetType?: CommentTargetType;
  isReply?: boolean;
  isExpanded?: boolean;
  activeReplyTargetId?: string | null;
  onToggleExpand?: (commentId: string) => void;
  onExpandReplies?: (commentId: string) => void;
  onToggleReplyForm?: (commentId: string) => void;
  onCloseReplyForm?: () => void;
  className?: string;
}

export function CommentItem({
  comment,
  postAuthorId,
  targetId,
  targetType,
  isReply = false,
  isExpanded = false,
  activeReplyTargetId = null,
  onToggleExpand,
  onExpandReplies,
  onToggleReplyForm,
  onCloseReplyForm,
  className,
}: CommentItemProps) {
  const { data: myProfile } = useProfile();
  const resolvedTargetType: CommentTargetType =
    targetType ?? comment.targetType ?? (comment.reelId ? 'reel' : 'post');
  const resolvedTargetId = targetId ?? comment.reelId ?? comment.postId ?? '';

  const deleteMutation = useDeleteComment(resolvedTargetId, resolvedTargetType);
  const likeMutation = useToggleCommentLike(resolvedTargetId, resolvedTargetType);

  const [reportOpen, setReportOpen] = React.useState(false);
  const [localExpanded, setLocalExpanded] = React.useState(false);
  const [localShowReply, setLocalShowReply] = React.useState(false);

  const expanded = onToggleExpand ? isExpanded : localExpanded;
  const showReplyForm =
    onToggleReplyForm ? activeReplyTargetId === comment.id : localShowReply;

  const toggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(comment.id);
    } else {
      setLocalExpanded((prev) => !prev);
    }
  };

  const expandReplies = () => {
    if (onExpandReplies) {
      onExpandReplies(comment.id);
    } else {
      setLocalExpanded(true);
    }
  };

  const toggleReplyForm = () => {
    if (onToggleReplyForm) {
      onToggleReplyForm(comment.id);
    } else {
      setLocalShowReply((prev) => !prev);
    }
  };

  const closeReplyForm = () => {
    if (onCloseReplyForm) {
      onCloseReplyForm();
    } else {
      setLocalShowReply(false);
    }
  };

  const { data: fetchedReplies, isLoading: loadingReplies } = useCommentReplies(
    comment.id,
    !isReply && expanded
  );

  const isDeletedPlaceholder = Boolean(comment.deleted || comment.body === '[deleted]');
  const isCommentAuthor = myProfile?.userId === comment.author.userId;
  const isPostAuthor = myProfile?.userId === postAuthorId;
  const canDelete = !isDeletedPlaceholder && (isCommentAuthor || isPostAuthor);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this comment?')) return;
    deleteMutation.mutate(comment.id);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeletedPlaceholder || likeMutation.isPending) return;
    likeMutation.mutate({
      commentId: comment.id,
      currentlyLiked: Boolean(comment.likedByViewer),
    });
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

  const likeCount = comment.likeCount ?? 0;
  const replyCount = comment.replyCount ?? 0;

  // Chronological ASC ordering when viewing expanded replies
  const expandedReplies = React.useMemo(() => {
    if (!fetchedReplies) return [];
    return [...fetchedReplies].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [fetchedReplies]);

  const previewReplies = comment.topReplies ?? [];
  const displayedReplies = !isReply
    ? expanded
      ? fetchedReplies
        ? expandedReplies
        : previewReplies
      : previewReplies
    : [];

  return (
    <div
      data-testid={
        resolvedTargetType === 'reel'
          ? `reel-comment-item-${comment.id}`
          : `comment-item-${comment.id}`
      }
      className={cn(
        isReply
          ? 'pt-2.5 first:pt-1.5'
          : 'py-3 border-b border-border/40 last:border-b-0',
        className
      )}
    >
      <div className="flex gap-2.5 group">
        {isDeletedPlaceholder ? (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] text-muted-foreground">
            —
          </div>
        ) : (
          <Link href={`/${comment.author.username}`} className="shrink-0 group">
            <Avatar className={cn('transition-opacity group-hover:opacity-85', isReply ? 'w-7 h-7' : 'w-8 h-8')}>
              <AvatarImage
                src={
                  comment.author.avatarUrl
                    ? normalizeStorageUrl(comment.author.avatarUrl)
                    : undefined
                }
                alt={comment.author.username}
              />
              <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
            </Avatar>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              {isDeletedPlaceholder ? (
                <span className="font-medium text-xs text-muted-foreground italic">
                  Comment deleted
                </span>
              ) : (
                <>
                  <Link
                    href={`/${comment.author.username}`}
                    className="font-medium text-xs hover:underline truncate"
                  >
                    {comment.author.name || comment.author.username}
                  </Link>
                  <span className="text-xs text-muted-foreground truncate">
                    @{comment.author.username}
                  </span>
                </>
              )}
              <span className="text-xs text-muted-foreground">·</span>
              <time
                dateTime={comment.createdAt}
                className="text-xs text-muted-foreground whitespace-nowrap"
              >
                {timeAgo}
              </time>
            </div>

            {!isDeletedPlaceholder && (
              <div className="flex items-center gap-1">
                {!isCommentAuthor && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReportOpen(true);
                    }}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Report comment"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span className="sr-only">Report comment</span>
                  </Button>
                )}

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={deleteMutation.isPending}
                    onClick={handleDelete}
                    data-testid={
                      resolvedTargetType === 'reel'
                        ? `delete-reel-comment-${comment.id}`
                        : `delete-comment-${comment.id}`
                    }
                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="sr-only">Delete comment</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          <p
            className={cn(
              'mt-1 text-sm whitespace-pre-wrap break-words leading-relaxed',
              isDeletedPlaceholder ? 'text-muted-foreground italic text-xs' : 'text-foreground'
            )}
          >
            {!isDeletedPlaceholder && comment.replyToUser?.username && (
              <Link
                href={`/${comment.replyToUser.username}`}
                className="text-primary font-medium hover:underline mr-1"
              >
                @{comment.replyToUser.username}
              </Link>
            )}
            {isDeletedPlaceholder ? '[deleted]' : comment.body}
          </p>

          {!isDeletedPlaceholder && (
            <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={handleLike}
                data-testid={`comment-like-btn-${comment.id}`}
                aria-label={comment.likedByViewer ? 'Unlike comment' : 'Like comment'}
                className={cn(
                  'inline-flex items-center gap-1 transition-colors hover:text-rose-500',
                  comment.likedByViewer && 'text-rose-500 font-medium'
                )}
              >
                <Heart
                  className={cn('w-3.5 h-3.5', comment.likedByViewer && 'fill-current')}
                />
                {likeCount > 0 && (
                  <span data-testid={`comment-like-count-${comment.id}`}>{likeCount}</span>
                )}
              </button>

              <button
                type="button"
                onClick={toggleReplyForm}
                data-testid={`comment-reply-btn-${comment.id}`}
                className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            </div>
          )}

          {showReplyForm && !isDeletedPlaceholder && resolvedTargetId && (
            <ReplyComposer
              targetId={resolvedTargetId}
              targetType={resolvedTargetType}
              parentCommentId={comment.id}
              replyToUsername={comment.author.username}
              onCancel={closeReplyForm}
              onSuccess={() => {
                closeReplyForm();
                if (!isReply) {
                  expandReplies();
                }
              }}
            />
          )}

          {!isReply && displayedReplies.length > 0 && (
            <div className="mt-2.5 pl-4 border-l-2 border-border/50 space-y-1">
              {displayedReplies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postAuthorId={postAuthorId}
                  targetId={resolvedTargetId}
                  targetType={resolvedTargetType}
                  isReply
                  activeReplyTargetId={activeReplyTargetId}
                  onToggleReplyForm={onToggleReplyForm}
                  onCloseReplyForm={onCloseReplyForm}
                />
              ))}
            </div>
          )}

          {!isReply && replyCount > 0 && (
            <div className="mt-2">
              <button
                type="button"
                onClick={toggleExpand}
                data-testid={`comment-replies-toggle-${comment.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                {loadingReplies && expanded ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : expanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {expanded
                    ? 'Hide replies'
                    : previewReplies.length > 0 && replyCount > previewReplies.length
                    ? `View ${replyCount} replies`
                    : previewReplies.length === 0
                    ? `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
                    : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        targetType="comment"
        targetId={comment.id}
        targetTitle={comment.body.slice(0, 40)}
      />
    </div>
  );
}
