'use client';

import * as React from 'react';
import Link from 'next/link';
import { useFeed, useSuggestions } from '@/hooks/useFeed';
import { useProfile } from '@/hooks/use-profile';
import { AppHeader } from '@/components/layout/app-header';
import { PostComposer } from '@/components/social/PostComposer';
import { PostList } from '@/components/social/PostList';
import { FollowButton } from '@/components/social/FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeStorageUrl } from '@/lib/utils';
import { Users, Sparkles, MessageSquareOff } from 'lucide-react';

export default function HomePage() {
  const { data: profile } = useProfile();
  const {
    posts,
    isLoading: isFeedLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useFeed();

  const isFollowingZero = (profile?.followingCount ?? 0) === 0;
  const { data: suggestions, isLoading: isSuggestionsLoading } = useSuggestions(6);

  return (
    <div>
      <AppHeader title="Home" />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Post composer at the top of feed */}
        <PostComposer
          placeholder="What's happening?"
          onSuccess={() => refetch()}
        />

        {/* Loading state */}
        {isFeedLoading ? (
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
        ) : posts.length > 0 ? (
          <PostList
            posts={posts}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        ) : isFollowingZero ? (
          /* Empty state when user follows nobody: suggestions */
          <Card className="border-dashed">
            <CardHeader className="text-center pb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6" />
              </div>
              <CardTitle className="text-lg">Find people to follow</CardTitle>
              <CardDescription className="max-w-sm mx-auto">
                Your home feed is quiet right now. Follow creators and friends to see their latest updates here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSuggestionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {suggestions.map((user) => {
                    const initials = (user.name || user.username || 'U')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <Link
                          href={`/${user.username}`}
                          className="flex items-center gap-3 min-w-0 group hover:opacity-85"
                        >
                          <Avatar className="w-10 h-10 shrink-0">
                            <AvatarImage
                              src={
                                user.avatarUrl
                                  ? normalizeStorageUrl(user.avatarUrl)
                                  : undefined
                              }
                              alt={user.username}
                            />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm group-hover:underline truncate">
                              {user.name || user.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{user.username} · {user.followerCount}{' '}
                              {user.followerCount === 1 ? 'follower' : 'followers'}
                            </p>
                          </div>
                        </Link>
                        <FollowButton
                          userId={user.userId}
                          initialIsFollowing={false}
                          initialFollowerCount={user.followerCount}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  No suggestions available right now. Check back soon!
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Empty state when user follows people but they haven't posted yet */
          <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-card text-muted-foreground my-4">
            <MessageSquareOff className="w-12 h-12 mb-3 stroke-[1.25] text-muted-foreground/60" />
            <h3 className="text-base font-semibold text-foreground">
              No posts yet from people you follow
            </h3>
            <p className="text-sm mt-1 max-w-sm text-muted-foreground">
              When people you follow post updates or thoughts, they will appear here in your feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
