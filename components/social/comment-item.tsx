'use client';

import * as React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProfile } from '@/hooks/use-profile';
import {
  useCommentReplies,
  useDeleteComment,
  useEditComment,
  usePinComment,
  useToggleCommentLike,
  useUnpinComment,
  type CommentTargetType,
} from '@/hooks/useComments';
import { ReplyComposer } from './reply-composer';
import { RichText } from './rich-text';
import {
  TokenAutocompleteDropdown,
  useTokenComposerInput,
} from './token-autocomplete';
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
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
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
  const editMutation = useEditComment(resolvedTargetId, resolvedTargetType);
  const pinMutation = usePinComment(resolvedTargetId);
  const unpinMutation = useUnpinComment(resolvedTargetId);
  const likeMutation = useToggleCommentLike(resolvedTargetId, resolvedTargetType);

  const [reportOpen, setReportOpen] = React.useState(false);
  const [localExpanded, setLocalExpanded] = React.useState(false);
  const [localShowReply, setLocalShowReply] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState(comment.body);
  const editTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

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
  const canPin = !isDeletedPlaceholder && !isReply && isPostAuthor && resolvedTargetType === 'post';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this comment?')) return;
    deleteMutation.mutate(comment.id);
  };

  const handleStartEdit = () => {
    setEditBody(comment.body);
    setIsEditing(true);
  };

  const submitEdit = React.useCallback(() => {
    const trimmed = editBody.trim();
    if (!trimmed || trimmed.length > 300 || editMutation.isPending) return;
    editMutation.mutate(
      { commentId: comment.id, body: trimmed },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  }, [comment.id, editBody, editMutation]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    submitEdit();
  };

  const editAutocomplete = useTokenComposerInput({
    value: editBody,
    setValue: setEditBody,
    inputRef: editTextareaRef,
    onSubmit: submitEdit,
    onEscape: () => setIsEditing(false),
  });

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!resolvedTargetId || pinMutation.isPending || unpinMutation.isPending) return;
    if (comment.pinned) {
      unpinMutation.mutate(comment.id);
    } else {
      pinMutation.mutate(comment.id);
    }
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
          {!isDeletedPlaceholder && comment.pinned && (
            <div
              data-testid={`comment-pinned-badge-${comment.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary mb-0.5"
            >
              <Pin className="w-3 h-3" />
              <span>Pinned</span>
            </div>
          )}

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
              {!isDeletedPlaceholder && comment.editedAt && (
                <span
                  data-testid={`comment-edited-badge-${comment.id}`}
                  title={`Edited ${new Date(comment.editedAt).toLocaleString()}`}
                  className="text-[11px] text-muted-foreground italic whitespace-nowrap"
                >
                  · Edited
                </span>
              )}
            </div>

            {!isDeletedPlaceholder && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid={`comment-menu-trigger-${comment.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    <span className="sr-only">Comment actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                  {canPin && (
                    <DropdownMenuItem
                      onClick={handleTogglePin}
                      disabled={pinMutation.isPending || unpinMutation.isPending}
                      data-testid={`pin-comment-${comment.id}`}
                    >
                      {comment.pinned ? (
                        <>
                          <PinOff className="w-3.5 h-3.5 mr-2" />
                          Unpin comment
                        </>
                      ) : (
                        <>
                          <Pin className="w-3.5 h-3.5 mr-2" />
                          Pin comment
                        </>
                      )}
                    </DropdownMenuItem>
                  )}

                  {isCommentAuthor && (
                    <DropdownMenuItem
                      onClick={handleStartEdit}
                      data-testid={`edit-comment-${comment.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-2" />
                      Edit comment
                    </DropdownMenuItem>
                  )}

                  {canDelete && (
                    <DropdownMenuItem
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      data-testid={
                        resolvedTargetType === 'reel'
                          ? `delete-reel-comment-${comment.id}`
                          : `delete-comment-${comment.id}`
                      }
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                      Delete comment
                    </DropdownMenuItem>
                  )}

                  {!isCommentAuthor && (
                    <>
                      {(canPin || canDelete) && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={() => setReportOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Flag className="w-3.5 h-3.5 mr-2" />
                        Report comment
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isEditing && !isDeletedPlaceholder ? (
            <form
              onSubmit={handleSaveEdit}
              onClick={(e) => e.stopPropagation()}
              data-testid={`comment-edit-form-${comment.id}`}
              className="mt-2 space-y-2"
            >
              <div className="relative border rounded-lg bg-background/60 focus-within:ring-1 focus-within:ring-ring">
                <TokenAutocompleteDropdown
                  activeToken={editAutocomplete.activeToken}
                  options={editAutocomplete.options}
                  isLoading={editAutocomplete.isLoading}
                  highlightedIndex={editAutocomplete.highlightedIndex}
                  position="above"
                  onSelect={editAutocomplete.handleSelectOption}
                />
                <Textarea
                  ref={editTextareaRef}
                  value={editBody}
                  onChange={editAutocomplete.handleInputChange}
                  onClick={editAutocomplete.handleCursorEvent}
                  onKeyUp={editAutocomplete.handleCursorEvent}
                  onBlur={editAutocomplete.clearAutocomplete}
                  onKeyDown={editAutocomplete.handleKeyDown}
                  rows={2}
                  maxLength={300}
                  autoFocus
                  data-testid={`comment-edit-input-${comment.id}`}
                  className="resize-none border-none focus-visible:ring-0 p-2 text-sm shadow-none bg-transparent w-full"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{editBody.length} / 300</span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={editMutation.isPending}
                    className="h-7 px-2.5 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!editBody.trim() || editBody.trim().length > 300 || editMutation.isPending}
                    data-testid={`comment-edit-save-${comment.id}`}
                    className="h-7 px-2.5 text-xs gap-1"
                  >
                    {editMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            </form>
          ) : (
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
              {isDeletedPlaceholder ? '[deleted]' : <RichText text={comment.body} />}
            </p>
          )}

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
