'use client';

import * as React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Bookmark,
  Film,
  Heart,
  Loader2,
  MessageCircle,
  Play,
  Share2,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { PostCard } from '@/components/social/PostCard';
import { RichText } from '@/components/social/rich-text';
import { ShareDialog } from '@/components/social/ShareDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSavedComments,
  useSavedPosts,
  useSavedReels,
  useToggleCommentSave,
  useToggleReelSave,
} from '@/hooks/useSaved';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import type { Comment, ReelItem, ShareContentType } from '@/lib/types';

type SavedTab = 'posts' | 'reels' | 'comments';

function InfiniteLoadTrigger({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}) {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!hasNextPage) return null;

  return (
    <div ref={sentinelRef} className="flex justify-center pt-4 pb-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => fetchNextPage()}
        disabled={isFetchingNextPage}
        className="gap-2"
      >
        {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin" />}
        Load more
      </Button>
    </div>
  );
}

export default function SavedPage() {
  const [activeTab, setActiveTab] = React.useState<SavedTab>('posts');
  const [shareTarget, setShareTarget] = React.useState<{
    contentType: ShareContentType;
    contentId: string;
    parentId?: string;
    parentType?: 'post' | 'reel';
    previewText?: string;
  } | null>(null);

  const savedPostsQuery = useSavedPosts(activeTab === 'posts');
  const savedReelsQuery = useSavedReels(activeTab === 'reels');
  const savedCommentsQuery = useSavedComments(activeTab === 'comments');

  const toggleReelSave = useToggleReelSave();
  const toggleCommentSave = useToggleCommentSave();

  const renderSavedReelCard = (reel: ReelItem) => {
    const shareCount = reel.shareCount ?? 0;
    return (
      <div
        key={reel.id}
        data-testid={`saved-reel-card-${reel.id}`}
        className="group relative border rounded-xl overflow-hidden bg-card flex flex-col"
      >
        <Link href={`/reels/${reel.id}`} className="relative aspect-[9/14] bg-zinc-950 block overflow-hidden">
          {reel.thumbnailUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={normalizeStorageUrl(reel.thumbnailUrl)}
              alt={reel.caption || 'Saved reel'}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <video
              src={normalizeStorageUrl(reel.videoUrl)}
              preload="metadata"
              muted
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            <Play className="w-3 h-3 fill-white" />
            <span>{Math.round(reel.duration)}s</span>
          </div>
          <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
            <p className="text-xs font-semibold truncate">@{reel.author.username}</p>
            {reel.caption && (
              <p className="text-xs text-white/85 line-clamp-2 mt-0.5">{reel.caption}</p>
            )}
          </div>
        </Link>

        <div className="p-2.5 flex items-center justify-between gap-2 text-xs text-muted-foreground border-t">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {reel.likeCount}
            </span>
            <button
              type="button"
              onClick={() =>
                setShareTarget({
                  contentType: 'reel',
                  contentId: reel.id,
                  previewText: reel.caption ?? undefined,
                })
              }
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
              aria-label="Share reel"
            >
              <Share2 className="w-3.5 h-3.5" />
              {shareCount > 0 && <span>{shareCount}</span>}
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              toggleReelSave.mutate({ reelId: reel.id, currentlySaved: true })
            }
            disabled={toggleReelSave.isPending}
            data-testid={`unsave-reel-${reel.id}`}
            aria-label="Unsave reel"
            className="inline-flex items-center gap-1 text-primary font-medium hover:opacity-80 transition-opacity"
          >
            <Bookmark className="w-4 h-4 fill-primary text-primary" />
            <span>Saved</span>
          </button>
        </div>
      </div>
    );
  };

  const renderSavedCommentCard = (comment: Comment) => {
    const isReel = comment.targetType === 'reel' || Boolean(comment.reelId);
    const parentId = comment.reelId ?? comment.postId ?? '';
    const parentHref = parentId
      ? `/${isReel ? 'reels' : 'posts'}/${parentId}#comment-${comment.id}`
      : '/';
    const initials = (comment.author.name || comment.author.username || 'U')
      .slice(0, 2)
      .toUpperCase();
    const shareCount = comment.shareCount ?? 0;
    const timestamp = comment.savedAt ?? comment.createdAt;
    const savedLabel = (() => {
      try {
        return `Saved ${formatDistanceToNow(new Date(timestamp), { addSuffix: true })}`;
      } catch {
        return 'Saved';
      }
    })();

    return (
      <div
        key={comment.id}
        data-testid={`saved-comment-card-${comment.id}`}
        className="p-4 border rounded-xl bg-card space-y-2.5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href={`/${comment.author.username}`} className="shrink-0">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={
                    comment.author.avatarUrl
                      ? normalizeStorageUrl(comment.author.avatarUrl)
                      : undefined
                  }
                  alt={comment.author.username}
                />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/${comment.author.username}`}
                  className="text-sm font-semibold hover:underline truncate"
                >
                  {comment.author.name || comment.author.username}
                </Link>
                <span className="text-xs text-muted-foreground truncate">
                  @{comment.author.username}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{savedLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              toggleCommentSave.mutate({ commentId: comment.id, currentlySaved: true })
            }
            disabled={toggleCommentSave.isPending}
            data-testid={`unsave-comment-${comment.id}`}
            aria-label="Unsave comment"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80 shrink-0"
          >
            <Bookmark className="w-4 h-4 fill-primary text-primary" />
            <span>Saved</span>
          </button>
        </div>

        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
          {comment.replyToUser?.username && (
            <Link
              href={`/${comment.replyToUser.username}`}
              className="text-primary font-medium hover:underline mr-1"
            >
              @{comment.replyToUser.username}
            </Link>
          )}
          <RichText text={comment.body} />
        </p>

        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {comment.likeCount ?? 0}
            </span>
            <button
              type="button"
              onClick={() =>
                setShareTarget({
                  contentType: 'comment',
                  contentId: comment.id,
                  parentId,
                  parentType: isReel ? 'reel' : 'post',
                  previewText: comment.body,
                })
              }
              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
              aria-label="Share comment"
            >
              <Share2 className="w-3.5 h-3.5" />
              {shareCount > 0 ? <span>{shareCount}</span> : <span>Share</span>}
            </button>
          </div>

          <Link
            href={parentHref}
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            <span>View {isReel ? 'reel' : 'post'}</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <AppHeader title="Saved" />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary" />
              Saved Items
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your bookmarked posts, reels, and comments, private to your account.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Saved content categories"
            className="inline-flex rounded-lg border bg-muted/40 p-1 self-start"
          >
            {(
              [
                { key: 'posts', label: 'Posts', icon: FileText },
                { key: 'reels', label: 'Reels', icon: Film },
                { key: 'comments', label: 'Comments', icon: MessageCircle },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const selected = activeTab === key;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={selected}
                  type="button"
                  data-testid={`saved-tab-${key}`}
                  onClick={() => setActiveTab(key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    selected
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Posts */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {savedPostsQuery.isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-xl bg-card space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : savedPostsQuery.posts.length === 0 ? (
              <div className="text-center py-16 border rounded-xl bg-card/50 px-6">
                <Bookmark className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <h2 className="text-base font-semibold">No saved posts yet</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Tap the bookmark icon on any post to save it here for later reading.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/">Browse feed</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {savedPostsQuery.posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
                <InfiniteLoadTrigger
                  hasNextPage={savedPostsQuery.hasNextPage}
                  isFetchingNextPage={savedPostsQuery.isFetchingNextPage}
                  fetchNextPage={savedPostsQuery.fetchNextPage}
                />
              </>
            )}
          </div>
        )}

        {/* Tab 2: Reels */}
        {activeTab === 'reels' && (
          <div className="space-y-4">
            {savedReelsQuery.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="aspect-[9/14] rounded-xl" />
                ))}
              </div>
            ) : savedReelsQuery.reels.length === 0 ? (
              <div className="text-center py-16 border rounded-xl bg-card/50 px-6">
                <Film className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <h2 className="text-base font-semibold">No saved reels yet</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Bookmark your favorite reels while watching and find them all right here.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/reels">Watch Reels</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedReelsQuery.reels.map(renderSavedReelCard)}
                </div>
                <InfiniteLoadTrigger
                  hasNextPage={savedReelsQuery.hasNextPage}
                  isFetchingNextPage={savedReelsQuery.isFetchingNextPage}
                  fetchNextPage={savedReelsQuery.fetchNextPage}
                />
              </>
            )}
          </div>
        )}

        {/* Tab 3: Comments */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {savedCommentsQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : savedCommentsQuery.comments.length === 0 ? (
              <div className="text-center py-16 border rounded-xl bg-card/50 px-6">
                <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                <h2 className="text-base font-semibold">No saved comments yet</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Bookmark helpful or memorable comments from any post or reel discussion.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/explore">Explore discussions</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {savedCommentsQuery.comments.map(renderSavedCommentCard)}
                </div>
                <InfiniteLoadTrigger
                  hasNextPage={savedCommentsQuery.hasNextPage}
                  isFetchingNextPage={savedCommentsQuery.isFetchingNextPage}
                  fetchNextPage={savedCommentsQuery.fetchNextPage}
                />
              </>
            )}
          </div>
        )}
      </div>

      {shareTarget && (
        <ShareDialog
          contentType={shareTarget.contentType}
          contentId={shareTarget.contentId}
          parentId={shareTarget.parentId}
          parentType={shareTarget.parentType}
          previewText={shareTarget.previewText}
          open={Boolean(shareTarget)}
          onOpenChange={(open) => {
            if (!open) setShareTarget(null);
          }}
        />
      )}
    </div>
  );
}
