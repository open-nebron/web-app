'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFollow } from '@/hooks/useFollow';
import { useProfile } from '@/hooks/use-profile';
import type { FollowSourceType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { UserPlus, UserCheck, UserX } from 'lucide-react';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
  followSource?: FollowSourceType;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onFollowChange?: (isFollowing: boolean, newCount: number) => void;
}

export function FollowButton({
  userId,
  initialIsFollowing = false,
  initialFollowerCount = 0,
  followSource = 'other',
  size = 'default',
  className,
  onFollowChange,
}: FollowButtonProps) {
  const { data: myProfile } = useProfile();
  const [isHovered, setIsHovered] = useState(false);

  const { isFollowing, followerCount, isLoading, toggleFollow } = useFollow(
    userId,
    initialIsFollowing,
    initialFollowerCount,
    followSource
  );

  React.useEffect(() => {
    if (onFollowChange) {
      onFollowChange(isFollowing, followerCount);
    }
  }, [isFollowing, followerCount, onFollowChange]);

  // Don't show follow button for oneself
  if (myProfile?.userId && myProfile.userId === userId) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFollow();
  };

  if (isFollowing) {
    return (
      <Button
        variant={isHovered ? 'destructive' : 'outline'}
        size={size}
        disabled={isLoading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        className={cn(
          'transition-all duration-150 min-w-[100px]',
          isHovered
            ? 'border-destructive text-destructive-foreground hover:bg-destructive'
            : 'border-border text-foreground hover:bg-muted',
          className
        )}
      >
        {isHovered ? (
          <>
            <UserX className="w-4 h-4 mr-1.5" />
            Unfollow
          </>
        ) : (
          <>
            <UserCheck className="w-4 h-4 mr-1.5 text-primary" />
            Following
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      size={size}
      disabled={isLoading}
      onClick={handleClick}
      className={cn('min-w-[90px]', className)}
    >
      <UserPlus className="w-4 h-4 mr-1.5" />
      Follow
    </Button>
  );
}
