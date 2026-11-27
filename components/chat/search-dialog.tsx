'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/lib/search-store';
import { chatApi } from '@/lib/chat-api';
import { exploreApi } from '@/lib/explore-api';
import { socialApi } from '@/lib/social-api';
import type { SearchMessageResult, PublicUser } from '@/lib/chat-types';
import type { Post, ReelItem } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  X,
  Loader2,
  MessageSquare,
  ArrowRight,
  User,
  FileText,
  Film,
  Hash,
  Heart,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type SearchTab = 'posts' | 'reels' | 'people' | 'hashtags' | 'messages';

function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['em', 'b', 'strong', 'i', 'span'],
  });
}

export function SearchDialog() {
  const router = useRouter();
  const { isOpen, conversationId, closeSearch, toggleSearch } = useSearchStore();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [scope, setScope] = useState<'conversation' | 'all'>('all');
  const [activeTab, setActiveTab] = useState<SearchTab>('posts');
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleSearch(conversationId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSearch, conversationId]);

  useEffect(() => {
    if (isOpen) {
      setScope(conversationId ? 'conversation' : 'all');
      setActiveTab(conversationId ? 'messages' : 'posts');
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen, conversationId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedQuery(query);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const targetConvId = scope === 'conversation' && conversationId ? conversationId : undefined;
  const trimmedQuery = debouncedQuery.trim();
  const isSearchActive = trimmedQuery.length > 0;
  const effectiveTab: SearchTab = scope === 'conversation' ? 'messages' : activeTab;

  const { data: msgResults = [], isLoading: isLoadingMsgs, isFetching: isFetchingMsgs } = useQuery({
    queryKey: ['searchMessages', trimmedQuery, targetConvId],
    queryFn: () => chatApi.searchMessages(trimmedQuery, targetConvId),
    enabled: isOpen && isSearchActive && effectiveTab === 'messages',
    staleTime: 10 * 1000,
  });

  const { data: userResults = [], isLoading: isLoadingUsers, isFetching: isFetchingUsers } = useQuery<PublicUser[]>({
    queryKey: ['searchUsers', trimmedQuery],
    queryFn: () => chatApi.searchUsers(trimmedQuery),
    enabled: isOpen && isSearchActive && scope === 'all' && effectiveTab === 'people',
    staleTime: 10 * 1000,
  });

  const { data: postSearchRes, isLoading: isLoadingPosts, isFetching: isFetchingPosts } = useQuery({
    queryKey: ['searchSocialPosts', trimmedQuery],
    queryFn: () => exploreApi.searchSocial({ q: trimmedQuery, type: 'posts', limit: 15 }),
    enabled: isOpen && isSearchActive && scope === 'all' && effectiveTab === 'posts',
    staleTime: 10 * 1000,
  });

  const { data: reelSearchRes, isLoading: isLoadingReels, isFetching: isFetchingReels } = useQuery({
    queryKey: ['searchSocialReels', trimmedQuery],
    queryFn: () => exploreApi.searchSocial({ q: trimmedQuery, type: 'reels', limit: 15 }),
    enabled: isOpen && isSearchActive && scope === 'all' && effectiveTab === 'reels',
    staleTime: 10 * 1000,
  });

  const { data: trendingTags = [] } = useQuery({
    queryKey: ['searchHashtags', trimmedQuery],
    queryFn: () => socialApi.getTrendingHashtags(30),
    enabled: isOpen && scope === 'all' && effectiveTab === 'hashtags',
    staleTime: 30 * 1000,
  });

  const cleanTagQuery = trimmedQuery.replace(/^#/, '').toLowerCase();
  const matchingHashtags = React.useMemo(() => {
    if (!cleanTagQuery) return trendingTags;
    const filtered = trendingTags.filter((t) => t.tag.includes(cleanTagQuery));
    if (
      /^[a-z0-9_]{1,50}$/.test(cleanTagQuery) &&
      !filtered.some((t) => t.tag === cleanTagQuery)
    ) {
      return [{ tag: cleanTagQuery, postCount: 0 }, ...filtered];
    }
    return filtered;
  }, [trendingTags, cleanTagQuery]);

  const handleSelectMessage = (item: SearchMessageResult) => {
    closeSearch();
    router.push(`/chat/${item.conversationId}?messageId=${item.id}`);
  };

  const handleSelectUser = (user: PublicUser) => {
    closeSearch();
    router.push(`/${user.username}`);
  };

  const postItems = (postSearchRes?.items ?? []) as Post[];
  const reelItems = (reelSearchRes?.items ?? []) as ReelItem[];

  const isBusy =
    (effectiveTab === 'messages' && (isLoadingMsgs || isFetchingMsgs)) ||
    (effectiveTab === 'people' && (isLoadingUsers || isFetchingUsers)) ||
    (effectiveTab === 'posts' && (isLoadingPosts || isFetchingPosts)) ||
    (effectiveTab === 'reels' && (isLoadingReels || isFetchingReels));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeSearch()}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-background">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Nebron</DialogTitle>
        </DialogHeader>

        {/* Search Input Header */}
        <div className="flex items-center px-4 py-3 border-b gap-2">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              scope === 'conversation'
                ? 'Search messages in this conversation...'
                : 'Search posts, reels, people, #hashtags, or messages...'
            }
            data-testid="global-search-input"
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-9 px-1 bg-transparent"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setQuery('')}
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Scope Toggle if opened from a conversation */}
        {conversationId && (
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40 text-xs">
            <span className="text-muted-foreground font-medium">Scope:</span>
            <button
              type="button"
              onClick={() => {
                setScope('conversation');
                setActiveTab('messages');
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                scope === 'conversation'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background hover:bg-muted text-foreground border'
              }`}
            >
              In this conversation
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                scope === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background hover:bg-muted text-foreground border'
              }`}
            >
              All Nebron
            </button>
          </div>
        )}

        {/* Search Tabs: Posts | Reels | People | Hashtags | Messages */}
        {scope === 'all' && (
          <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/20 overflow-x-auto">
            {(
              [
                { id: 'posts', label: 'Posts', icon: FileText },
                { id: 'reels', label: 'Reels', icon: Film },
                { id: 'people', label: 'People', icon: User },
                { id: 'hashtags', label: 'Hashtags', icon: Hash },
                { id: 'messages', label: 'Messages', icon: MessageSquare },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = effectiveTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  data-testid={`search-tab-${t.id}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Results Panel */}
        <div className="max-h-[420px] overflow-y-auto p-2 space-y-2">
          {isBusy && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Searching...</p>
            </div>
          )}

          {!isSearchActive && effectiveTab !== 'hashtags' && (
            <div className="py-8 text-center text-xs text-muted-foreground px-4">
              Type a keyword to search across {effectiveTab}.
            </div>
          )}

          {/* Posts tab */}
          {!isBusy && isSearchActive && effectiveTab === 'posts' && (
            postItems.length > 0 ? (
              <div className="divide-y divide-border/30" data-testid="search-posts-results">
                {postItems.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      closeSearch();
                      router.push(`/posts/${post.id}`);
                    }}
                    className="w-full p-3 rounded-md hover:bg-accent transition-colors text-left space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">@{post.author.username}</span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {post.likeCount}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{post.body}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No posts found matching &ldquo;{trimmedQuery}&rdquo;.
              </div>
            )
          )}

          {/* Reels tab */}
          {!isBusy && isSearchActive && effectiveTab === 'reels' && (
            reelItems.length > 0 ? (
              <div className="divide-y divide-border/30" data-testid="search-reels-results">
                {reelItems.map((reel) => (
                  <button
                    key={reel.id}
                    type="button"
                    onClick={() => {
                      closeSearch();
                      router.push(`/reels/${reel.id}`);
                    }}
                    className="w-full p-3 rounded-md hover:bg-accent transition-colors text-left space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">@{reel.author.username}</span>
                      <span>{reel.viewCount} views</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-2">{reel.caption || 'Reel'}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No reels found matching &ldquo;{trimmedQuery}&rdquo;.
              </div>
            )
          )}

          {/* People tab */}
          {!isBusy && isSearchActive && effectiveTab === 'people' && (
            userResults.length > 0 ? (
              <div className="divide-y divide-border/30">
                {userResults.map((u) => {
                  const displayName = u.name || u.username;
                  const initial = (displayName[0] || 'U').toUpperCase();
                  return (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => handleSelectUser(u)}
                      className="w-full group flex items-center justify-between p-2.5 rounded-md hover:bg-accent cursor-pointer transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="w-8 h-8 border border-border/40 shrink-0">
                          <AvatarImage src={u.avatarUrl || undefined} alt={displayName} />
                          <AvatarFallback className="text-xs font-semibold">{initial}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 text-primary font-medium text-xs transition-opacity shrink-0">
                        View profile <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No people found matching &ldquo;{trimmedQuery}&rdquo;.
              </div>
            )
          )}

          {/* Hashtags tab */}
          {effectiveTab === 'hashtags' && (
            matchingHashtags.length > 0 ? (
              <div className="divide-y divide-border/30" data-testid="search-hashtags-results">
                {matchingHashtags.map((tagItem) => (
                  <button
                    key={tagItem.tag}
                    type="button"
                    onClick={() => {
                      closeSearch();
                      router.push(`/hashtag/${encodeURIComponent(tagItem.tag)}`);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-md hover:bg-accent transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-primary">#{tagItem.tag}</span>
                    {tagItem.postCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {tagItem.postCount} posts
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No matching hashtags found.
              </div>
            )
          )}

          {/* Messages tab */}
          {!isBusy && isSearchActive && effectiveTab === 'messages' && (
            msgResults.length > 0 ? (
              <div className="divide-y divide-border/30">
                {msgResults.map((item) => {
                  const formattedHtml = sanitizeHtml(item.highlightedBody || item.body);
                  let relativeTime = '';
                  try {
                    relativeTime = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
                  } catch {
                    relativeTime = '';
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectMessage(item)}
                      className="group flex flex-col p-3 rounded-md hover:bg-accent cursor-pointer transition-colors text-left"
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                        <span className="font-mono text-[10px] uppercase tracking-wider">
                          {relativeTime}
                        </span>
                        <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 text-primary font-medium text-xs transition-opacity">
                          Jump to message <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                      <div
                        className="text-sm text-foreground break-words line-clamp-3 leading-relaxed [&_em]:bg-amber-400/30 [&_em]:text-amber-900 dark:[&_em]:text-amber-200 [&_em]:font-semibold [&_em]:not-italic [&_em]:px-0.5 [&_em]:rounded"
                        dangerouslySetInnerHTML={{ __html: formattedHtml }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No messages found matching &ldquo;{trimmedQuery}&rdquo;.
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
