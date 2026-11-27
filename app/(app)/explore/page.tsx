'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AppHeader } from '@/components/layout/app-header';
import { PostCard } from '@/components/social/PostCard';
import { FollowButton } from '@/components/social/FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrendingHashtags } from '@/hooks/usePosts';
import { apiFetch } from '@/lib/api';
import { exploreApi } from '@/lib/explore-api';
import { normalizeStorageUrl } from '@/lib/utils';
import type {
  ExploreSuggestionItem,
  ExploreTrendingPeriod,
  ExploreTrendingType,
  Post,
  ReelItem,
  UserFollowItem,
} from '@/lib/types';
import {
  Compass,
  Film,
  Flame,
  Hash,
  Heart,
  Play,
  Search,
  Sparkles,
  UserX,
  Users,
} from 'lucide-react';

function ExploreReelCard({ reel }: { reel: ReelItem }) {
  return (
    <Link
      href={`/reels/${reel.id}`}
      data-testid={`explore-reel-card-${reel.id}`}
      className="group relative rounded-xl border bg-zinc-950 overflow-hidden aspect-[9/14] flex flex-col justify-between p-3 text-white hover:border-primary/60 transition-colors"
    >
      {reel.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={normalizeStorageUrl(reel.thumbnailUrl)}
          alt={reel.caption || 'Reel'}
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/90 via-zinc-900 to-zinc-950" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

      <div className="relative z-10 flex items-center justify-between text-[11px] text-white/90">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
          <Film className="w-3 h-3" /> Reel
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
          <Play className="w-3 h-3 fill-current" /> {reel.viewCount}
        </span>
      </div>

      <div className="relative z-10 space-y-1">
        <p className="text-xs font-semibold line-clamp-2">
          {reel.caption || `@${reel.author.username}`}
        </p>
        <div className="flex items-center justify-between text-[11px] text-white/80">
          <span className="truncate">@{reel.author.username}</span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <Heart className="w-3 h-3" /> {reel.likeCount}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserFollowItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [activeTab, setActiveTab] = useState<'for_you' | 'trending' | 'people' | 'hashtags'>('for_you');
  const [trendingType, setTrendingType] = useState<ExploreTrendingType>('posts');
  const [trendingPeriod, setTrendingPeriod] = useState<ExploreTrendingPeriod>('7d');

  const { data: suggestions, isLoading: isSuggestionsLoading } = useQuery<ExploreSuggestionItem[]>({
    queryKey: ['explore', 'suggestions', 10],
    queryFn: () => exploreApi.getSuggestions(10),
    staleTime: 60_000,
  });

  const { data: trendingHashtags, isLoading: isHashtagsLoading } = useTrendingHashtags(20);

  const { data: forYouPostsRes, isLoading: isForYouPostsLoading } = useQuery({
    queryKey: ['explore', 'trending', 'posts', '7d', 10],
    queryFn: () => exploreApi.getTrending({ type: 'posts', period: '7d', limit: 10 }),
    staleTime: 60_000,
  });

  const { data: forYouReelsRes, isLoading: isForYouReelsLoading } = useQuery({
    queryKey: ['explore', 'trending', 'reels', '7d', 6],
    queryFn: () => exploreApi.getTrending({ type: 'reels', period: '7d', limit: 6 }),
    staleTime: 60_000,
  });

  const { data: trendingTabRes, isLoading: isTrendingTabLoading } = useQuery({
    queryKey: ['explore', 'trending', trendingType, trendingPeriod, 20],
    queryFn: () =>
      exploreApi.getTrending({ type: trendingType, period: trendingPeriod, limit: 20 }),
    enabled: activeTab === 'trending',
    staleTime: 60_000,
  });

  const { data: postSearchRes, isLoading: isSearchingPosts } = useQuery({
    queryKey: ['explore', 'search-social', 'posts', debouncedQuery],
    queryFn: () => exploreApi.searchSocial({ q: debouncedQuery, type: 'posts', limit: 15 }),
    enabled: debouncedQuery.length > 0,
    staleTime: 15_000,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const forYouPosts = (forYouPostsRes?.items ?? []) as Post[];
  const forYouReels = (forYouReelsRes?.items ?? []) as ReelItem[];

  return (
    <div>
      <AppHeader title="Explore" />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people or posts on Nebron..."
            data-testid="explore-search-input"
            className="pl-10 h-11 bg-card rounded-xl text-sm"
          />
        </div>

        {/* Search Results Mode */}
        {debouncedQuery ? (
          <div className="space-y-6" data-testid="explore-search-results">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                People
              </h3>
              {isSearching ? (
                <Skeleton className="h-20 rounded-xl" />
              ) : searchResults.length > 0 ? (
                <div className="border rounded-xl bg-card divide-y divide-border/50 overflow-hidden">
                  {searchResults.map((user) => {
                    const initials = (user.name || user.username || 'U').slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={user.userId}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-accent/40 transition-colors"
                      >
                        <Link href={`/${user.username}`} className="flex items-center gap-3 min-w-0 group">
                          <Avatar className="w-10 h-10">
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
                <div className="text-center py-6 border rounded-xl bg-card text-muted-foreground text-xs">
                  <UserX className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                  No matching people found for &quot;{debouncedQuery}&quot;.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Posts
              </h3>
              {isSearchingPosts ? (
                <Skeleton className="h-32 rounded-xl" />
              ) : (postSearchRes?.items?.length ?? 0) > 0 ? (
                <div className="space-y-4">
                  {(postSearchRes?.items as Post[]).map((post) => (
                    <PostCard key={post.id} post={post} impressionSource="explore" />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-xl bg-card text-muted-foreground text-xs">
                  No matching posts found for &quot;{debouncedQuery}&quot;.
                </div>
              )}
            </div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-full space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4" data-testid="explore-tabs">
              <TabsTrigger value="for_you" data-testid="explore-tab-for-you">
                For you
              </TabsTrigger>
              <TabsTrigger value="trending" data-testid="explore-tab-trending">
                Trending
              </TabsTrigger>
              <TabsTrigger value="people" data-testid="explore-tab-people">
                People
              </TabsTrigger>
              <TabsTrigger value="hashtags" data-testid="explore-tab-hashtags">
                Hashtags
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: For you */}
            <TabsContent value="for_you" className="space-y-8" data-testid="explore-panel-for-you">
              {forYouReels.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
                    <Film className="w-4 h-4 text-primary" />
                    <span>Featured Reels</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {forYouReels.slice(0, 3).map((reel) => (
                      <ExploreReelCard key={reel.id} reel={reel} />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>For You Posts</span>
                </div>
                {isForYouPostsLoading || isForYouReelsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                  </div>
                ) : forYouPosts.length > 0 ? (
                  <div className="space-y-4">
                    {forYouPosts.map((post) => (
                      <PostCard key={post.id} post={post} impressionSource="explore" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground">
                    <Compass className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <h4 className="text-sm font-semibold text-foreground">Nothing to explore yet</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Posts and reels from across Nebron will appear here.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 2: Trending */}
            <TabsContent value="trending" className="space-y-5" data-testid="explore-panel-trending">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border bg-card p-1">
                  {(['posts', 'reels'] as const).map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={trendingType === t ? 'secondary' : 'ghost'}
                      onClick={() => setTrendingType(t)}
                      data-testid={`trending-type-${t}`}
                      className="h-7 px-3 text-xs capitalize"
                    >
                      {t}
                    </Button>
                  ))}
                </div>

                <div className="inline-flex items-center rounded-lg border bg-card p-1">
                  {(['24h', '7d'] as const).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={trendingPeriod === p ? 'secondary' : 'ghost'}
                      onClick={() => setTrendingPeriod(p)}
                      data-testid={`trending-period-${p}`}
                      className="h-7 px-3 text-xs"
                    >
                      Last {p}
                    </Button>
                  ))}
                </div>
              </div>

              {isTrendingTabLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              ) : trendingType === 'posts' ? (
                (trendingTabRes?.items?.length ?? 0) > 0 ? (
                  <div className="space-y-4">
                    {(trendingTabRes?.items as Post[]).map((post) => (
                      <PostCard key={post.id} post={post} impressionSource="explore" />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground text-sm">
                    <Flame className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No trending posts in the last {trendingPeriod}.
                  </div>
                )
              ) : (trendingTabRes?.items?.length ?? 0) > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(trendingTabRes?.items as ReelItem[]).map((reel) => (
                    <ExploreReelCard key={reel.id} reel={reel} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground text-sm">
                  <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No trending reels in the last {trendingPeriod}.
                </div>
              )}
            </TabsContent>

            {/* Tab 3: People */}
            <TabsContent value="people" className="space-y-4" data-testid="explore-panel-people">
              {isSuggestionsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                  ))}
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestions.map((user) => {
                    const initials = (user.name || user.username || 'U').slice(0, 2).toUpperCase();
                    return (
                      <div
                        key={user.userId}
                        data-testid={`explore-person-card-${user.userId}`}
                        className="p-4 border rounded-xl bg-card flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                      >
                        <Link href={`/${user.username}`} className="flex items-center gap-3 min-w-0 group">
                          <Avatar className="w-12 h-12 shrink-0">
                            <AvatarImage
                              src={user.avatarUrl ? normalizeStorageUrl(user.avatarUrl) : undefined}
                              alt={user.username}
                            />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 space-y-0.5">
                            <p className="font-semibold text-sm text-foreground group-hover:underline truncate">
                              {user.name || user.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{user.username} · {user.followerCount} followers
                            </p>
                            {user.contextLabel && (
                              <p className="text-[11px] text-primary font-medium truncate">
                                {user.contextLabel}
                              </p>
                            )}
                          </div>
                        </Link>
                        <FollowButton
                          userId={user.userId}
                          initialIsFollowing={false}
                          initialFollowerCount={user.followerCount}
                          followSource="suggestion"
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No creator suggestions right now.
                </div>
              )}
            </TabsContent>

            {/* Tab 4: Hashtags */}
            <TabsContent value="hashtags" className="space-y-4" data-testid="explore-panel-hashtags">
              {isHashtagsLoading ? (
                <Skeleton className="h-32 rounded-xl" />
              ) : trendingHashtags && trendingHashtags.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="explore-trending-hashtags">
                  {trendingHashtags.map((item, idx) => (
                    <Link
                      key={item.tag}
                      href={`/hashtag/${encodeURIComponent(item.tag)}`}
                      className="p-4 rounded-xl border bg-card hover:border-primary/50 hover:bg-accent/40 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">#{item.tag}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.postCount} {item.postCount === 1 ? 'post' : 'posts'} this week
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Hash className="w-3 h-3" /> Explore
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground text-sm">
                  <Hash className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No trending hashtags yet this week.
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
