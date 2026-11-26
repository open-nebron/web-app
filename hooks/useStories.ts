'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storiesApi } from '@/lib/stories-api';
import { toast } from '@/components/ui/use-toast';
import type {
  StoriesFeedResponse,
  StoryGroup,
  StoryMediaType,
  StoryViewersResponse,
} from '@/lib/types';

export function useStories() {
  const queryClient = useQueryClient();

  const query = useQuery<StoriesFeedResponse>({
    queryKey: ['stories'],
    queryFn: () => storiesApi.getStories(),
    staleTime: 30 * 1000,
  });

  const markStoryViewed = React.useCallback(
    async (storyId: string, authorId: string) => {
      // Optimistically update feed stories cache
      queryClient.setQueryData<StoriesFeedResponse>(['stories'], (old) => {
        if (!old) return old;
        return {
          ...old,
          groups: old.groups.map((group) => {
            if (group.userId !== authorId) return group;
            const updatedStories = group.stories.map((s) =>
              s.id === storyId ? { ...s, viewedByMe: true } : s
            );
            return {
              ...group,
              stories: updatedStories,
              hasUnviewed: updatedStories.some((s) => !s.viewedByMe),
            };
          }),
        };
      });

      // Optimistically update individual user stories cache
      queryClient.setQueryData<StoryGroup>(['user-stories', authorId], (old) => {
        if (!old) return old;
        const updatedStories = old.stories.map((s) =>
          s.id === storyId ? { ...s, viewedByMe: true } : s
        );
        return {
          ...old,
          stories: updatedStories,
          hasUnviewed: updatedStories.some((s) => !s.viewedByMe),
        };
      });

      try {
        await storiesApi.viewStory(storyId);
      } catch {
        // Non-blocking error if already viewed or network blip
      }
    },
    [queryClient]
  );

  return {
    ...query,
    groups: query.data?.groups ?? [],
    markStoryViewed,
  };
}

export function useUserStories(userId?: string | null) {
  return useQuery<StoryGroup>({
    queryKey: ['user-stories', userId],
    queryFn: () => storiesApi.getUserStories(userId!),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    retry: false,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      file: File;
      mediaType: StoryMediaType;
      duration: number;
      caption?: string;
      onProgress?: (percent: number) => void;
    }) => {
      const slot = await storiesApi.uploadStoryFile(params.file, params.onProgress);
      return storiesApi.confirmStory({
        objectKey: slot.objectKey,
        mediaType: params.mediaType,
        duration: params.duration,
        caption: params.caption?.trim() || null,
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['user-stories', created.authorId] });
      toast({
        title: 'Story shared',
        description: 'Your story is now live for 24 hours.',
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to publish story';
      toast({
        variant: 'destructive',
        title: 'Could not publish story',
        description: msg,
      });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storyId: string) => storiesApi.deleteStory(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['user-stories'] });
      toast({
        title: 'Story deleted',
        description: 'Your story has been removed.',
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Could not delete story';
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: msg,
      });
    },
  });
}

export function useStoryViewers(storyId?: string | null, enabled: boolean = false) {
  return useQuery<StoryViewersResponse>({
    queryKey: ['story-viewers', storyId],
    queryFn: () => storiesApi.getStoryViewers(storyId!),
    enabled: Boolean(storyId) && enabled,
    staleTime: 15 * 1000,
  });
}
