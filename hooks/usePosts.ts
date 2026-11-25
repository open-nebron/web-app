'use client';

import * as React from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '@/lib/social-api';
import { toast } from '@/components/ui/use-toast';
import type { Post } from '@/lib/types';

export function useUserPosts(userId?: string | null) {
  const query = useInfiniteQuery<Post[]>({
    queryKey: ['posts', userId],
    queryFn: async ({ pageParam }) => {
      if (!userId) return [];
      return socialApi.getUserPosts(userId, {
        limit: 20,
        before: pageParam as string | undefined,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 20) return undefined;
      return lastPage[lastPage.length - 1].createdAt;
    },
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  });

  const posts = React.useMemo(() => {
    return query.data?.pages.flatMap((page) => page) ?? [];
  }, [query.data]);

  return {
    ...query,
    posts,
  };
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => socialApi.createPost(body),
    onSuccess: (newPost) => {
      queryClient.invalidateQueries({ queryKey: ['posts', newPost.author.userId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Post created',
        description: 'Your post is now live.',
      });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Post creation failed',
        description: error.message || 'Could not create post',
      });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => socialApi.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Post deleted',
        description: 'Your post has been removed.',
      });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message || 'Could not delete post',
      });
    },
  });
}
