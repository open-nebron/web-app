'use client';

import * as React from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { socialApi } from '@/lib/social-api';
import { reelsApi } from '@/lib/reels-api';
import {
  patchCommentInCaches,
  patchPostInCaches,
  patchReelInCaches,
} from '@/lib/comment-cache';
import type { Comment, Post, ReelItem, ShareContentType } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

export function useSavedPosts(enabled: boolean = true) {
  const query = useInfiniteQuery<Post[]>({
    queryKey: ['saved-posts'],
    queryFn: ({ pageParam }) =>
      socialApi.getSavedPosts({
        limit: 20,
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 20) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last.savedAt ?? last.createdAt;
    },
    enabled,
    staleTime: 30 * 1000,
  });

  const posts = React.useMemo(
    () => query.data?.pages.flatMap((page) => page) ?? [],
    [query.data]
  );

  return { ...query, posts };
}

export function useSavedReels(enabled: boolean = true) {
  const query = useInfiniteQuery<ReelItem[]>({
    queryKey: ['saved-reels'],
    queryFn: ({ pageParam }) =>
      reelsApi.getSavedReels({
        limit: 20,
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 20) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last.savedAt ?? last.createdAt;
    },
    enabled,
    staleTime: 30 * 1000,
  });

  const reels = React.useMemo(
    () => query.data?.pages.flatMap((page) => page) ?? [],
    [query.data]
  );

  return { ...query, reels };
}

export function useSavedComments(enabled: boolean = true) {
  const query = useInfiniteQuery<Comment[]>({
    queryKey: ['saved-comments'],
    queryFn: ({ pageParam }) =>
      socialApi.getSavedComments({
        limit: 20,
        before: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < 20) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last.savedAt ?? last.createdAt;
    },
    enabled,
    staleTime: 30 * 1000,
  });

  const comments = React.useMemo(
    () => query.data?.pages.flatMap((page) => page) ?? [],
    [query.data]
  );

  return { ...query, comments };
}

export function useTogglePostSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, currentlySaved }: { postId: string; currentlySaved: boolean }) =>
      currentlySaved ? socialApi.unsavePost(postId) : socialApi.savePost(postId),
    onMutate: async ({ postId, currentlySaved }) => {
      const nextSaved = !currentlySaved;
      patchPostInCaches(queryClient, postId, {
        savedByViewer: nextSaved,
        saveDelta: nextSaved ? 1 : -1,
      });
      return { postId, currentlySaved };
    },
    onError: (error: { message?: string }, _vars, context) => {
      if (context) {
        patchPostInCaches(queryClient, context.postId, {
          savedByViewer: context.currentlySaved,
          saveDelta: context.currentlySaved ? 1 : -1,
        });
      }
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error?.message || 'Could not update bookmark.',
      });
    },
    onSettled: (_data, _err, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

export function useToggleReelSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reelId, currentlySaved }: { reelId: string; currentlySaved: boolean }) =>
      currentlySaved ? reelsApi.unsaveReel(reelId) : reelsApi.saveReel(reelId),
    onMutate: async ({ reelId, currentlySaved }) => {
      const nextSaved = !currentlySaved;
      patchReelInCaches(queryClient, reelId, {
        savedByViewer: nextSaved,
        saveDelta: nextSaved ? 1 : -1,
      });
      return { reelId, currentlySaved };
    },
    onError: (error: { message?: string }, _vars, context) => {
      if (context) {
        patchReelInCaches(queryClient, context.reelId, {
          savedByViewer: context.currentlySaved,
          saveDelta: context.currentlySaved ? 1 : -1,
        });
      }
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error?.message || 'Could not update reel bookmark.',
      });
    },
    onSettled: (_data, _err, { reelId }) => {
      queryClient.invalidateQueries({ queryKey: ['saved-reels'] });
      queryClient.invalidateQueries({ queryKey: ['reel', reelId] });
    },
  });
}

export function useToggleCommentSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, currentlySaved }: { commentId: string; currentlySaved: boolean }) =>
      currentlySaved ? socialApi.unsaveComment(commentId) : socialApi.saveComment(commentId),
    onMutate: async ({ commentId, currentlySaved }) => {
      const nextSaved = !currentlySaved;
      patchCommentInCaches(queryClient, commentId, {
        savedByViewer: nextSaved,
        saveDelta: nextSaved ? 1 : -1,
      });
      return { commentId, currentlySaved };
    },
    onError: (error: { message?: string }, _vars, context) => {
      if (context) {
        patchCommentInCaches(queryClient, context.commentId, {
          savedByViewer: context.currentlySaved,
          saveDelta: context.currentlySaved ? 1 : -1,
        });
      }
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error?.message || 'Could not update comment bookmark.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-comments'] });
    },
  });
}

export function useShareContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contentType,
      contentId,
    }: {
      contentType: ShareContentType;
      contentId: string;
    }) => socialApi.shareContent(contentType, contentId),
    onSuccess: (res, vars) => {
      if (vars.contentType === 'post') {
        patchPostInCaches(queryClient, vars.contentId, { shareCount: res.shareCount });
      } else if (vars.contentType === 'reel') {
        patchReelInCaches(queryClient, vars.contentId, { shareCount: res.shareCount });
      } else if (vars.contentType === 'comment') {
        patchCommentInCaches(queryClient, vars.contentId, { shareCount: res.shareCount });
      }
    },
  });
}
