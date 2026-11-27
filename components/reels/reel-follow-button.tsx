'use client';

import * as React from 'react';
import { useFollow } from '@/hooks/useFollow';
import { useProfile } from '@/hooks/use-profile';
import { cn } from '@/lib/utils';

interface ReelFollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  className?: string;
}

export function ReelFollowButton({
  userId,
  initialIsFollowing,
  className,
}: ReelFollowButtonProps) {
  const { data: myProfile } = useProfile();
  const { isFollowing, isLoading, toggleFollow } = useFollow(userId, initialIsFollowing, 0, 'reel');

  if (myProfile?.userId && myProfile.userId === userId) {
    return null;
  }

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleFollow();
      }}
      data-testid={`reel-follow-btn-${userId}`}
      className={cn(
        'px-3 py-1 rounded-full text-xs font-semibold transition-colors border',
        isFollowing
          ? 'bg-white/15 border-white/40 text-white hover:bg-white/25'
          : 'bg-primary border-primary text-primary-foreground hover:bg-primary/90',
        className
      )}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
