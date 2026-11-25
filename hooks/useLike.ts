'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '@/lib/social-api';
import { toast } from '@/components/ui/use-toast';

export function useLike(
  postId: string,
  initialLiked: boolean = false,
  initialCount: number = 0
) {
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setLikeCount(initialCount);
  }, [initialCount]);

  const likeMutation = useMutation({
    mutationFn: () => socialApi.likePost(postId),
    onMutate: () => {
      setLiked(true);
      setLikeCount((prev) => prev + 1);
    },
    onError: (error: { message?: string }) => {
      setLiked(initialLiked);
      setLikeCount(initialCount);
      toast({
        variant: 'destructive',
        title: 'Like failed',
        description: error.message || 'Could not like post',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => socialApi.unlikePost(postId),
    onMutate: () => {
      setLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    },
    onError: (error: { message?: string }) => {
      setLiked(initialLiked);
      setLikeCount(initialCount);
      toast({
        variant: 'destructive',
        title: 'Unlike failed',
        description: error.message || 'Could not unlike post',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const toggleLike = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (liked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };

  return {
    liked,
    likeCount,
    isLoading: likeMutation.isPending || unlikeMutation.isPending,
    toggleLike,
  };
}
