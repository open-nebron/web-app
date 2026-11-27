'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { useLike } from '@/hooks/useLike';
import { useTogglePostSave, useShareContent } from '@/hooks/useSaved';
import { useProfile } from '@/hooks/use-profile';
import { useDeletePost, useEditPost } from '@/hooks/usePosts';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Lightbox } from './Lightbox';
import { CommentSheet } from './CommentSheet';
import { SharePostDialog } from './SharePostDialog';
import { RichText } from './rich-text';
import { ReportDialog } from '@/components/reports/ReportDialog';
import type { Post } from '@/lib/types';
import {
  Bookmark,
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  MoreHorizontal,
  Copy,
  Send,
  Pencil,
  Loader2,
  X,
  Flag,
} from 'lucide-react';

interface PostCardProps {
  post: Post;
  className?: string;
  onPostClick?: (post: Post) => void;
  disableCommentSheet?: boolean;
}

export function PostCard({
  post,
  className,
  onPostClick,
  disableCommentSheet = false,
}: PostCardProps) {
  const router = useRouter();
  const { data: myProfile } = useProfile();
  const deleteMutation = useDeletePost();
  const editMutation = useEditPost(post.id);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [removeImage, setRemoveImage] = useState(false);

  const { liked, likeCount, isLoading: isLikeLoading, toggleLike } = useLike(
    post.id,
    post.likedByViewer,
    post.likeCount
  );
  const saveMutation = useTogglePostSave();
  const shareMutation = useShareContent();

  const isSaved = Boolean(post.savedByViewer);
  const saveCount = post.saveCount ?? 0;
  const shareCount = post.shareCount ?? 0;

  const isAuthor = myProfile?.userId === post.author.userId;

  const isEdited = React.useMemo(() => {
    if (!post.updatedAt) return false;
    const created = new Date(post.createdAt).getTime();
    const updated = new Date(post.updatedAt).getTime();
    return updated > created + 1000;
  }, [post.createdAt, post.updatedAt]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking interactive controls or during editing
    if (isEditing) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[role="menu"]') ||
      target.closest('[role="dialog"]')
    ) {
      return;
    }
    if (onPostClick) {
      onPostClick(post);
    } else {
      router.push(`/posts/${post.id}`);
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableCommentSheet) {
      handleCardClick(e);
    } else {
      setIsCommentSheetOpen(true);
    }
  };

  const handleCopyLink = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    let url = `${window.location.origin}/posts/${post.id}`;
    try {
      const tracked = await shareMutation.mutateAsync({ contentType: 'post', contentId: post.id });
      if (tracked?.url) url = tracked.url;
    } catch {
      // Fallback to local URL
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied',
        description: 'Post link copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Share failed',
        description: 'Could not copy link to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (saveMutation.isPending) return;
    saveMutation.mutate({ postId: post.id, currentlySaved: isSaved });
  };

  const handleOpenShareToChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareDialogOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this post?')) return;
    deleteMutation.mutate(post.id);
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditBody(post.body);
    setRemoveImage(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditBody(post.body);
    setRemoveImage(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBody.trim() || editMutation.isPending) return;

    editMutation.mutate(
      {
        body: editBody.trim(),
        removeImage: removeImage ? true : undefined,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const authorInitials = (post.author.name || post.author.username || 'U')
    .slice(0, 2)
    .toUpperCase();

  const timeAgo = React.useMemo(() => {
    try {
      return formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
    } catch {
      return '';
    }
  }, [post.createdAt]);

  const hasImage = Boolean(post.imageUrl) && !removeImage;

  return (
    <>
      <article
        onClick={handleCardClick}
        className={cn(
          'p-4 border rounded-xl bg-card transition-colors duration-150',
          !isEditing && 'cursor-pointer hover:bg-accent/40',
          className
        )}
      >
        <div className="flex gap-3">
          <Link
            href={`/${post.author.username}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 group"
          >
            <Avatar className="w-10 h-10 transition-opacity group-hover:opacity-85">
              <AvatarImage
                src={post.author.avatarUrl ? normalizeStorageUrl(post.author.avatarUrl) : undefined}
                alt={post.author.username}
              />
              <AvatarFallback>{authorInitials}</AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            {/* Header: Author info + timestamp + Options Menu */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <Link
                  href={`/${post.author.username}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-sm hover:underline truncate"
                >
                  {post.author.name || post.author.username}
                </Link>
                <span className="text-xs text-muted-foreground truncate">
                  @{post.author.username}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <time
                  dateTime={post.createdAt}
                  className="text-xs text-muted-foreground whitespace-nowrap"
                >
                  {timeAgo}
                </time>
                {isEdited && (
                  <span className="text-xs text-muted-foreground italic select-none">
                    · (edited)
                  </span>
                )}
              </div>

              {/* Options Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenShareToChat}>
                    <Send className="w-4 h-4 mr-2" />
                    Share to chat
                  </DropdownMenuItem>

                  {!isAuthor && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setIsReportDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Report post
                      </DropdownMenuItem>
                    </>
                  )}

                  {isAuthor && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleStartEdit}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit post
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete post
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Post Content / Edit Form */}
            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="mt-3 space-y-3">
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  className="resize-none text-sm w-full bg-background"
                  maxLength={500}
                />

                {post.imageUrl && !removeImage && (
                  <div className="relative inline-block overflow-hidden rounded-lg border border-border/50 max-h-40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={normalizeStorageUrl(post.imageUrl)}
                      alt="Post media"
                      className="max-h-40 object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setRemoveImage(true)}
                      className="absolute top-2 right-2 h-7 px-2 text-xs bg-black/60 text-white hover:bg-black/80 gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Remove image
                    </Button>
                  </div>
                )}

                {post.imageUrl && removeImage && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>Image will be removed upon saving.</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => setRemoveImage(false)}
                    >
                      Undo
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {editBody.length} / 500
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={editMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!editBody.trim() || editMutation.isPending}
                      className="gap-1.5"
                    >
                      {editMutation.isPending && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <>
                <p className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                  <RichText text={post.body} />
                </p>

                {/* Post Image */}
                {hasImage && post.imageUrl && (
                  <div
                    className="mt-3 overflow-hidden rounded-xl border border-border/50 bg-muted/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(true);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={normalizeStorageUrl(post.imageUrl)}
                      alt="Post media"
                      className="max-h-[400px] w-full object-cover transition-transform hover:scale-[1.01]"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Footer action buttons */}
                <div className="flex items-center gap-6 mt-3.5 pt-1 text-muted-foreground">
                  <button
                    type="button"
                    onClick={toggleLike}
                    disabled={isLikeLoading}
                    className={cn(
                      'flex items-center gap-1.5 text-xs transition-colors hover:text-rose-500 group',
                      liked && 'text-rose-500 font-semibold'
                    )}
                  >
                    <Heart
                      className={cn(
                        'w-4 h-4 transition-transform group-hover:scale-110',
                        liked && 'fill-rose-500 text-rose-500'
                      )}
                    />
                    <span>{likeCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCommentClick}
                    className="flex items-center gap-1.5 text-xs transition-colors hover:text-primary group"
                  >
                    <MessageCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>{post.commentCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenShareToChat}
                    data-testid={`post-share-btn-${post.id}`}
                    aria-label="Share post"
                    className="flex items-center gap-1.5 text-xs transition-colors hover:text-primary group"
                  >
                    <Share2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span data-testid={`post-share-count-${post.id}`}>
                      {shareCount > 0 ? shareCount : 'Share'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleSave}
                    disabled={saveMutation.isPending}
                    data-testid={`post-save-btn-${post.id}`}
                    aria-label={isSaved ? 'Unsave post' : 'Save post'}
                    className={cn(
                      'ml-auto flex items-center gap-1.5 text-xs transition-colors hover:text-primary group',
                      isSaved && 'text-primary font-semibold'
                    )}
                  >
                    <Bookmark
                      className={cn(
                        'w-4 h-4 transition-transform group-hover:scale-110',
                        isSaved && 'fill-primary text-primary'
                      )}
                    />
                    {saveCount > 0 && (
                      <span data-testid={`post-save-count-${post.id}`}>{saveCount}</span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </article>

      {/* Lightbox Modal */}
      {post.imageUrl && (
        <Lightbox
          src={post.imageUrl}
          alt={`Image by ${post.author.username}`}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}

      {/* Comments Sheet */}
      {!disableCommentSheet && (
        <CommentSheet
          post={post}
          isOpen={isCommentSheetOpen}
          onOpenChange={setIsCommentSheetOpen}
        />
      )}

      {/* Share To Chat Dialog */}
      <SharePostDialog
        post={post}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />

      {/* Report Post Dialog */}
      <ReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        targetType="post"
        targetId={post.id}
        targetTitle={post.body.slice(0, 50)}
      />
    </>
  );
}
