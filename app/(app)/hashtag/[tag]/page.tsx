'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Compass, Hash, Loader2 } from 'lucide-react';
import { AppHeader } from '@/components/layout/app-header';
import { PostCard } from '@/components/social/PostCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHashtagPosts } from '@/hooks/usePosts';

export default function HashtagPage() {
  const params = useParams<{ tag: string }>();
  const rawTag = decodeURIComponent(params?.tag || '');
  const tag = rawTag.replace(/^#/, '').trim().toLowerCase();

  const {
    posts,
    postCount,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useHashtagPosts(tag);

  return (
    <div>
      <AppHeader
        title={`#${tag}`}
        leading={
          <Link
            href="/explore"
            aria-label="Back to Explore"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Hashtag summary header */}
        <div
          data-testid="hashtag-header"
          className="p-5 border rounded-2xl bg-card flex items-center gap-4 shadow-sm"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Hash className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight truncate">#{tag}</h2>
            {isLoading ? (
              <Skeleton className="h-4 w-16 mt-1" />
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="hashtag-post-count">
                {postCount} {postCount === 1 ? 'post' : 'posts'}
              </p>
            )}
          </div>
        </div>

        {/* Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-xl bg-card space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4" data-testid="hashtag-posts-list">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {hasNextPage && (
              <div className="pt-2 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="gap-2"
                >
                  {isFetchingNextPage && <Loader2 className="w-4 h-4 animate-spin" />}
                  Load more
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground">
            <Compass className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <h3 className="text-sm font-semibold text-foreground">No posts for #{tag} yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Use #{tag} in a post to start the conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
