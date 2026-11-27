'use client';

import * as React from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '@/lib/social-api';
import { toast } from '@/components/ui/use-toast';
import type { HashtagPostsResponse, Post, TrendingHashtag } from '@/lib/types';

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
    mutationFn: (payload: string | { body: string; imageKey?: string | null }) =>
      socialApi.createPost(payload),
    onSuccess: (newPost) => {
      queryClient.invalidateQueries({ queryKey: ['posts', newPost.author.userId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['hashtag-posts'] });
      queryClient.invalidateQueries({ queryKey: ['trending-hashtags'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['user-by-username'] });
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
      queryClient.invalidateQueries({ queryKey: ['hashtag-posts'] });
      queryClient.invalidateQueries({ queryKey: ['trending-hashtags'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['user-by-username'] });
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

export function useEditPost(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (update: { body?: string; removeImage?: boolean }) =>
      socialApi.editPost(postId, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['popular-posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-likes'] });
      queryClient.invalidateQueries({ queryKey: ['hashtag-posts'] });
      queryClient.invalidateQueries({ queryKey: ['trending-hashtags'] });
      toast({
        title: 'Post updated',
        description: 'Your changes have been saved.',
      });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error.message || 'Could not update post',
      });
    },
  });
}

export function usePopularPosts(limit: number = 20) {
  return useQuery<Post[]>({
    queryKey: ['popular-posts', limit],
    queryFn: () => socialApi.getPopularPosts(limit),
    staleTime: 60 * 1000,
  });
}

export function useMyLikedPosts(enabled: boolean = true) {
  const query = useInfiniteQuery<Post[]>({
    queryKey: ['my-likes'],
    queryFn: async ({ pageParam }) => {
      return socialApi.getMyLikedPosts({
        limit: 20,
        before: pageParam as string | undefined,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 20) return undefined;
      return lastPage[lastPage.length - 1].createdAt;
    },
    enabled,
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

export function useHashtagPosts(tag: string) {
  const normalizedTag = tag.replace(/^#/, '').trim().toLowerCase();

  const query = useInfiniteQuery<HashtagPostsResponse>({
    queryKey: ['hashtag-posts', normalizedTag],
    queryFn: async ({ pageParam }) => {
      if (!normalizedTag) {
        return { tag: '', postCount: 0, data: [], hasMore: false };
      }
      return socialApi.getHashtagPosts(normalizedTag, {
        limit: 20,
        before: pageParam as string | undefined,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage?.hasMore || lastPage.data.length === 0) return undefined;
      return lastPage.data[lastPage.data.length - 1].createdAt;
    },
    enabled: Boolean(normalizedTag),
    staleTime: 20 * 1000,
  });

  const posts = React.useMemo(() => {
    return query.data?.pages.flatMap((p) => p.data) ?? [];
  }, [query.data]);

  const postCount = query.data?.pages[0]?.postCount ?? 0;

  return {
    ...query,
    posts,
    postCount,
  };
}

export function useTrendingHashtags(limit: number = 10, enabled: boolean = true) {
  return useQuery<TrendingHashtag[]>({
    queryKey: ['trending-hashtags', limit],
    queryFn: () => socialApi.getTrendingHashtags(limit),
    enabled,
    staleTime: 60 * 1000,
  });
}
