'use client';

import * as React from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  reelsApi,
  extractVideoThumbnail,
  hasViewedReelInSession,
  markReelViewedInSession,
} from '@/lib/reels-api';
import { captureAnalytics } from '@/lib/analytics';
import { toast } from '@/components/ui/use-toast';
import type {
  ReelCommentItem,
  ReelItem,
  ReelsFeedResponse,
} from '@/lib/types';

export function useReelsFeed() {
  return useInfiniteQuery<
    ReelsFeedResponse,
    Error,
    InfiniteData<ReelsFeedResponse>,
    string[],
    string | undefined
  >({
    queryKey: ['reels-feed'],
    queryFn: ({ pageParam }) => reelsApi.getFeedReels(pageParam, 10),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
  });
}

export function useUserReels(userId?: string | null) {
  return useInfiniteQuery<
    ReelsFeedResponse,
    Error,
    InfiniteData<ReelsFeedResponse>,
    Array<string | null | undefined>,
    string | undefined
  >({
    queryKey: ['user-reels', userId],
    queryFn: ({ pageParam }) => reelsApi.getUserReels(userId!, pageParam, 12),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  });
}

export function useReel(reelId?: string | null) {
  return useQuery<ReelItem>({
    queryKey: ['reel', reelId],
    queryFn: () => reelsApi.getReelById(reelId!),
    enabled: Boolean(reelId),
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useCreateReel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      file: File;
      duration: number;
      caption?: string;
      onProgress?: (percent: number) => void;
      signal?: AbortSignal;
    }) => {
      // Optional non-blocking thumbnail capture in browser
      const thumbBlob = await extractVideoThumbnail(params.file).catch(() => null);

      const videoSlot = await reelsApi.uploadReelVideo(
        params.file,
        params.onProgress,
        params.signal
      );

      let thumbnailKey: string | null = null;
      if (thumbBlob && thumbBlob.size > 0) {
        try {
          const thumbSlot = await reelsApi.uploadReelThumbnail(thumbBlob, params.signal);
          thumbnailKey = thumbSlot.objectKey;
        } catch {
          // Non-blocking: video reel still publishes even if thumbnail fails
          thumbnailKey = null;
        }
      }

      const created = await reelsApi.confirmReel({
        videoKey: videoSlot.objectKey,
        thumbnailKey,
        caption: params.caption?.trim() || null,
        duration: Number(params.duration.toFixed(1)),
      });

      captureAnalytics('reel_created', {
        reelId: created.id,
        duration: created.duration,
      });

      return created;
    },
    onSuccess: (created) => {
      // Prepend newly created reel into feed cache so it appears at top immediately
      queryClient.setQueryData<InfiniteData<ReelsFeedResponse>>(['reels-feed'], (old) => {
        if (!old || old.pages.length === 0) {
          return {
            pages: [{ items: [created], nextCursor: null }],
            pageParams: [undefined],
          };
        }
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [{ ...first, items: [created, ...first.items] }, ...rest],
        };
      });
      queryClient.invalidateQueries({ queryKey: ['user-reels', created.authorId] });
      toast({
        title: 'Reel published',
        description: 'Your reel is now live.',
      });
    },
    onError: (err: any) => {
      if (err?.name === 'AbortError') return;
      toast({
        variant: 'destructive',
        title: 'Failed to publish reel',
        description: err?.message || 'Could not upload reel.',
      });
    },
  });
}

export function useToggleReelLike() {
  const queryClient = useQueryClient();

  const updateReelCaches = (
    reelId: string,
    updater: (reel: ReelItem) => ReelItem
  ) => {
    queryClient.setQueryData<ReelItem>(['reel', reelId], (old) =>
      old ? updater(old) : old
    );
    queryClient.setQueryData<InfiniteData<ReelsFeedResponse>>(['reels-feed'], (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => (item.id === reelId ? updater(item) : item)),
        })),
      };
    });
    queryClient.setQueriesData<InfiniteData<ReelsFeedResponse>>(
      { queryKey: ['user-reels'] },
      (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === reelId ? updater(item) : item)),
          })),
        };
      }
    );
  };

  return useMutation({
    mutationFn: async ({ reelId, likedByMe }: { reelId: string; likedByMe: boolean }) => {
      if (likedByMe) {
        return reelsApi.unlikeReel(reelId);
      }
      return reelsApi.likeReel(reelId);
    },
    onMutate: ({ reelId, likedByMe }) => {
      const nextLiked = !likedByMe;
      updateReelCaches(reelId, (r) => ({
        ...r,
        likedByMe: nextLiked,
        likeCount: Math.max(0, r.likeCount + (nextLiked ? 1 : -1)),
      }));
    },
    onSuccess: (res, { reelId }) => {
      updateReelCaches(reelId, (r) => ({
        ...r,
        likedByMe: res.liked,
        likeCount: res.likeCount,
      }));
    },
    onError: (_err, { reelId, likedByMe }) => {
      // Revert optimistic state
      updateReelCaches(reelId, (r) => ({
        ...r,
        likedByMe,
        likeCount: Math.max(0, r.likeCount + (likedByMe ? 1 : -1)),
      }));
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: 'Could not update reel like.',
      });
    },
  });
}

export function useReelComments(reelId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();

  const query = useQuery<ReelCommentItem[]>({
    queryKey: ['reel-comments', reelId],
    queryFn: () => reelsApi.getComments(reelId!, 30),
    enabled: Boolean(reelId) && enabled,
    staleTime: 10 * 1000,
  });

  const adjustCommentCount = (targetReelId: string, delta: number) => {
    const apply = (r: ReelItem): ReelItem => ({
      ...r,
      commentCount: Math.max(0, r.commentCount + delta),
    });
    queryClient.setQueryData<ReelItem>(['reel', targetReelId], (old) =>
      old ? apply(old) : old
    );
    queryClient.setQueryData<InfiniteData<ReelsFeedResponse>>(['reels-feed'], (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) => (item.id === targetReelId ? apply(item) : item)),
        })),
      };
    });
  };

  const addComment = useMutation({
    mutationFn: (body: string) => reelsApi.createComment(reelId!, body),
    onSuccess: (created) => {
      queryClient.setQueryData<ReelCommentItem[]>(['reel-comments', reelId], (old) => [
        ...(old ?? []),
        created,
      ]);
      if (reelId) adjustCommentCount(reelId, 1);
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Comment failed',
        description: err?.message || 'Could not post comment.',
      });
    },
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: string) => reelsApi.deleteComment(commentId),
    onSuccess: (_void, commentId) => {
      queryClient.setQueryData<ReelCommentItem[]>(['reel-comments', reelId], (old) =>
        (old ?? []).filter((c) => c.id !== commentId)
      );
      if (reelId) adjustCommentCount(reelId, -1);
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: err?.message || 'Could not delete comment.',
      });
    },
  });

  return {
    ...query,
    comments: query.data ?? [],
    addComment,
    deleteComment,
  };
}

export function useDeleteReel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reelId: string) => reelsApi.deleteReel(reelId),
    onSuccess: (_void, reelId) => {
      queryClient.setQueryData<InfiniteData<ReelsFeedResponse>>(['reels-feed'], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((r) => r.id !== reelId),
          })),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['user-reels'] });
      queryClient.removeQueries({ queryKey: ['reel', reelId] });
      toast({
        title: 'Reel deleted',
        description: 'Your reel has been removed.',
      });
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: err?.message || 'Could not delete reel.',
      });
    },
  });
}

export function useRecordReelView() {
  const queryClient = useQueryClient();

  return React.useCallback(
    async (reelId: string) => {
      if (!reelId || hasViewedReelInSession(reelId)) return;
      markReelViewedInSession(reelId);

      // Optimistically bump UI view count
      const bump = (r: ReelItem): ReelItem => ({ ...r, viewCount: r.viewCount + 1 });
      queryClient.setQueryData<ReelItem>(['reel', reelId], (old) => (old ? bump(old) : old));
      queryClient.setQueryData<InfiniteData<ReelsFeedResponse>>(['reels-feed'], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === reelId ? bump(item) : item)),
          })),
        };
      });

      captureAnalytics('reel_viewed', { reelId });

      try {
        await reelsApi.recordView(reelId);
      } catch {
        // Non-blocking view telemetry
      }
    },
    [queryClient]
  );
}
