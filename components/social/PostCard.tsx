'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useLike } from '@/hooks/useLike';
import { useProfile } from '@/hooks/use-profile';
import { useDeletePost } from '@/hooks/usePosts';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Lightbox } from './Lightbox';
import { CommentSheet } from './CommentSheet';
import type { Post } from '@/lib/types';
import { Heart, MessageCircle, Share2, Trash2 } from 'lucide-react';

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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);

  const { liked, likeCount, isLoading: isLikeLoading, toggleLike } = useLike(
    post.id,
    post.likedByViewer,
    post.likeCount
  );

  const isAuthor = myProfile?.userId === post.author.userId;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking interactive controls
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const url = `${window.location.origin}/posts/${post.id}`;
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this post?')) return;
    deleteMutation.mutate(post.id);
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

  return (
    <>
      <article
        onClick={handleCardClick}
        className={cn(
          'p-4 border rounded-xl bg-card transition-colors duration-150 cursor-pointer hover:bg-accent/40',
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
              </div>

              {isAuthor && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deleteMutation.isPending}
                  onClick={handleDelete}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="sr-only">Delete post</span>
                </Button>
              )}
            </div>

            <p className="mt-2 text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
              {post.body}
            </p>

            {/* Post Image */}
            {post.imageUrl && (
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
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs transition-colors hover:text-primary group"
              >
                <Share2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Share</span>
              </button>
            </div>
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
    </>
  );
}
