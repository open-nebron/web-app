'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '@/lib/social-api';
import { toast } from '@/components/ui/use-toast';

export function useFollow(
  userId: string,
  initialIsFollowing: boolean = false,
  initialFollowerCount: number = 0
) {
  const queryClient = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  useEffect(() => {
    setFollowerCount(initialFollowerCount);
  }, [initialFollowerCount]);

  const followMutation = useMutation({
    mutationFn: () => socialApi.follow(userId),
    onMutate: () => {
      setIsFollowing(true);
      setFollowerCount((prev) => prev + 1);
    },
    onError: (error: { message?: string }) => {
      setIsFollowing(initialIsFollowing);
      setFollowerCount(initialFollowerCount);
      toast({
        variant: 'destructive',
        title: 'Follow failed',
        description: error.message || 'Could not follow user',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-by-username'] });
      queryClient.invalidateQueries({ queryKey: ['followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => socialApi.unfollow(userId),
    onMutate: () => {
      setIsFollowing(false);
      setFollowerCount((prev) => Math.max(0, prev - 1));
    },
    onError: (error: { message?: string }) => {
      setIsFollowing(initialIsFollowing);
      setFollowerCount(initialFollowerCount);
      toast({
        variant: 'destructive',
        title: 'Unfollow failed',
        description: error.message || 'Could not unfollow user',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-by-username'] });
      queryClient.invalidateQueries({ queryKey: ['followers', userId] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });

  const toggleFollow = () => {
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return {
    isFollowing,
    followerCount,
    isLoading: followMutation.isPending || unfollowMutation.isPending,
    toggleFollow,
  };
}
