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
import type { SearchMessageResult, PublicUser } from '@/lib/chat-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, X, Loader2, MessageSquare, ArrowRight, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  const [, startTransition] = useTransition();

  // Register global Cmd+K / Ctrl+K keyboard shortcut
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

  // Sync default scope when dialog opens
  useEffect(() => {
    if (isOpen) {
      setScope(conversationId ? 'conversation' : 'all');
      setQuery('');
      setDebouncedQuery('');
    }
  }, [isOpen, conversationId]);

  // 300ms debounce on search input
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

  const { data: results = [], isLoading, isFetching } = useQuery({
    queryKey: ['searchMessages', trimmedQuery, targetConvId],
    queryFn: () => chatApi.searchMessages(trimmedQuery, targetConvId),
    enabled: isOpen && isSearchActive,
    staleTime: 10 * 1000,
  });

  const { data: userResults = [], isLoading: isLoadingUsers, isFetching: isFetchingUsers } = useQuery<PublicUser[]>({
    queryKey: ['searchUsers', trimmedQuery],
    queryFn: () => chatApi.searchUsers(trimmedQuery),
    enabled: isOpen && isSearchActive && scope === 'all',
    staleTime: 10 * 1000,
  });

  const handleSelectResult = (item: SearchMessageResult) => {
    closeSearch();
    router.push(`/chat/${item.conversationId}?messageId=${item.id}`);
  };

  const handleSelectUser = (user: PublicUser) => {
    closeSearch();
    router.push(`/${user.username}`);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeSearch();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Search messages</DialogTitle>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b h-14 gap-3 bg-background">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              scope === 'all' ? 'Search people and messages...' : 'Search messages in this conversation...'
            }
            className="flex-1 h-9 border-0 shadow-none focus-visible:ring-0 px-0 text-base"
            autoFocus
          />
          {query ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
              }}
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </Button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground bg-muted border rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Scope Toggle (if conversationId is available) */}
        {conversationId && (
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40 text-xs">
            <span className="text-muted-foreground font-medium">Scope:</span>
            <button
              type="button"
              onClick={() => setScope('conversation')}
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
              People &amp; Messages
            </button>
          </div>
        )}

        {/* Results / Empty / Loading Container */}
        <div className="max-h-[400px] overflow-y-auto p-2 space-y-2">
          {(isLoading || isFetching || (scope === 'all' && (isLoadingUsers || isFetchingUsers))) && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Searching...</p>
            </div>
          )}

          {!isLoading &&
            !(scope === 'all' && isLoadingUsers) &&
            isSearchActive &&
            results.length === 0 &&
            (scope !== 'all' || userResults.length === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 text-center px-4">
                <MessageSquare className="w-8 h-8 opacity-40 mb-1" />
                <p className="text-sm font-medium text-foreground">No results found</p>
                <p className="text-xs max-w-xs text-muted-foreground">
                  No matches found for &ldquo;{trimmedQuery}&rdquo;{' '}
                  {scope === 'conversation' ? 'in this conversation' : 'across people or messages'}.
                </p>
              </div>
            )}

          {!isSearchActive && (
            <div className="py-8 text-center text-xs text-muted-foreground px-4">
              {scope === 'all'
                ? 'Type to search people by name/username or search chat messages'
                : 'Type to search messages with instant matching and highlight'}
            </div>
          )}

          {scope === 'all' && !isLoadingUsers && userResults.length > 0 && (
            <div className="space-y-1">
              <div className="px-2 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                People
              </div>
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
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-1">
              {scope === 'all' && (
                <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Messages
                </div>
              )}
              <div className="divide-y divide-border/30">
                {results.map((item) => {
                  const formattedHtml = sanitizeHtml(item.highlightedBody || item.body);
                  let relativeTime = '';
                  try {
                    relativeTime = formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                    });
                  } catch {
                    relativeTime = '';
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectResult(item)}
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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
