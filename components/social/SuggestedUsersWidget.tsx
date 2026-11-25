'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSuggestions } from '@/hooks/useFeed';
import { FollowButton } from './FollowButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeStorageUrl } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

export function SuggestedUsersWidget() {
  const { data: suggestions, isLoading } = useSuggestions(5);

  if (isLoading) {
    return (
      <div className="p-4 border rounded-xl bg-card space-y-3">
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="p-4 border rounded-xl bg-card space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Suggested for you</span>
        </div>
        <Link
          href="/explore"
          className="text-xs text-primary hover:underline font-medium"
        >
          See all
        </Link>
      </div>

      <div className="space-y-3 divide-y divide-border/40">
        {suggestions.slice(0, 5).map((user) => {
          const initials = (user.name || user.username || 'U')
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={user.userId}
              className="flex items-center justify-between pt-2.5 first:pt-0 gap-2"
            >
              <Link
                href={`/${user.username}`}
                className="flex items-center gap-2.5 min-w-0 group"
              >
                <Avatar className="w-9 h-9 shrink-0 transition-opacity group-hover:opacity-85">
                  <AvatarImage
                    src={user.avatarUrl ? normalizeStorageUrl(user.avatarUrl) : undefined}
                    alt={user.username}
                  />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="font-medium text-xs truncate group-hover:underline text-foreground">
                    {user.name || user.username}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    @{user.username}
                  </div>
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
    </div>
  );
}
