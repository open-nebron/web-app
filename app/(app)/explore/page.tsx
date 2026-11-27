'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/app-header';
import { PostCard } from '@/components/social/PostCard';
import { FollowButton } from '@/components/social/FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useSuggestions } from '@/hooks/useFeed';
import { usePopularPosts, useTrendingHashtags } from '@/hooks/usePosts';
import { apiFetch } from '@/lib/api';
import { normalizeStorageUrl } from '@/lib/utils';
import type { UserFollowItem } from '@/lib/types';
import { Compass, Flame, Hash, Search, Sparkles, UserX, Users } from 'lucide-react';

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserFollowItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: suggestions, isLoading: isSuggestionsLoading } = useSuggestions(6);
  const { data: trendingHashtags } = useTrendingHashtags(10);
  const { data: popularPosts, isLoading: isPopularLoading } = usePopularPosts(20);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute user search
  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    apiFetch<{ users?: UserFollowItem[] } | UserFollowItem[]>(
      `/api/core/users/search?q=${encodeURIComponent(debouncedQuery)}&limit=15`
    )
      .then((res) => {
        if (active) {
          const list = Array.isArray(res) ? res : res?.users || [];
          setSearchResults(list);
        }
      })
      .catch(() => {
        if (active) {
          setSearchResults([]);
        }
      })
      .finally(() => {
        if (active) {
          setIsSearching(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  return (
    <div>
      <AppHeader title="Explore" />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users on Nebron..."
            className="pl-10 h-11 bg-card rounded-xl text-sm"
          />
        </div>

        {/* Search Results (when searching) */}
        {debouncedQuery ? (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Search Results
            </h3>

            {isSearching ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-3 border rounded-xl bg-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="border rounded-xl bg-card divide-y divide-border/50 overflow-hidden">
                {searchResults.map((user) => {
                  const initials = (user.name || user.username || 'U')
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div
                      key={user.userId}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-accent/40 transition-colors"
                    >
                      <Link
                        href={`/${user.username}`}
                        className="flex items-center gap-3 min-w-0 group"
                      >
                        <Avatar className="w-10 h-10 transition-opacity group-hover:opacity-85">
                          <AvatarImage
                            src={user.avatarUrl ? normalizeStorageUrl(user.avatarUrl) : undefined}
                            alt={user.username}
                          />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-foreground group-hover:underline truncate">
                            {user.name || user.username}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            @{user.username}
                          </div>
                        </div>
                      </Link>

                      <FollowButton
                        userId={user.userId}
                        initialIsFollowing={Boolean(user.isFollowedByViewer)}
                        initialFollowerCount={user.followerCount ?? 0}
                        followSource="search"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground">
                <UserX className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <h4 className="text-sm font-semibold text-foreground">No users found</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  We couldn&apos;t find anyone matching &quot;{debouncedQuery}&quot;.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Default Explore Content */
          <>
            {/* Suggested Creators */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Suggested Creators</span>
              </div>

              {isSuggestionsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border rounded-xl bg-card space-y-3 text-center">
                      <Skeleton className="w-12 h-12 rounded-full mx-auto" />
                      <Skeleton className="h-4 w-24 mx-auto" />
                      <Skeleton className="h-3 w-16 mx-auto" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ))}
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {suggestions.map((user) => {
                    const initials = (user.name || user.username || 'U')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <div
                        key={user.userId}
                        className="p-4 border rounded-xl bg-card flex flex-col items-center text-center space-y-3 hover:border-primary/40 transition-colors"
                      >
                        <Link href={`/${user.username}`} className="group">
                          <Avatar className="w-14 h-14 mx-auto mb-2 transition-opacity group-hover:opacity-85">
                            <AvatarImage
                              src={user.avatarUrl ? normalizeStorageUrl(user.avatarUrl) : undefined}
                              alt={user.username}
                            />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="font-semibold text-sm text-foreground group-hover:underline truncate max-w-[160px]">
                            {user.name || user.username}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[160px]">
                            @{user.username}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {user.followerCount} followers
                          </div>
                        </Link>

                        <div className="w-full pt-1">
                          <FollowButton
                            userId={user.userId}
                            initialIsFollowing={false}
                            initialFollowerCount={user.followerCount}
                            followSource="suggestion"
                            className="w-full justify-center"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Trending Hashtags */}
            {trendingHashtags && trendingHashtags.length > 0 && (
              <div className="space-y-3" data-testid="explore-trending-hashtags">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <Hash className="w-4 h-4 text-primary" />
                  <span>Trending Hashtags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.map((item) => (
                    <Link
                      key={item.tag}
                      href={`/hashtag/${encodeURIComponent(item.tag)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card hover:border-primary/50 hover:bg-accent/50 transition-colors text-xs font-medium"
                    >
                      <span className="text-primary">#{item.tag}</span>
                      <span className="text-[11px] text-muted-foreground">{item.postCount}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Posts */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>Popular This Week</span>
              </div>

              {isPopularLoading ? (
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
              ) : popularPosts && popularPosts.length > 0 ? (
                <div className="space-y-4">
                  {popularPosts.map((post) => (
                    <PostCard key={post.id} post={post} impressionSource="explore" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground">
                  <Compass className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <h4 className="text-sm font-semibold text-foreground">No popular posts yet</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Posts with likes from the last 7 days will appear here.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
