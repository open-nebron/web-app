'use client';

import * as React from 'react';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Post } from '@/lib/types';
import { MessageSquareOff, Loader2 } from 'lucide-react';

interface PostListProps {
  posts: Post[];
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
}

export function PostList({
  posts,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  emptyMessage = 'No posts yet',
  emptyDescription = 'Posts will appear here once published.',
  className,
}: PostListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border rounded-xl bg-card space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-card text-muted-foreground my-4">
        <MessageSquareOff className="w-12 h-12 mb-3 stroke-[1.25] text-muted-foreground/60" />
        <h3 className="text-base font-semibold text-foreground">{emptyMessage}</h3>
        <p className="text-sm mt-1 max-w-sm">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage?.()}
            className="w-full sm:w-auto"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading more...
              </>
            ) : (
              'Load more posts'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
