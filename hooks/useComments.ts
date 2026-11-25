'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '@/lib/social-api';
import { toast } from '@/components/ui/use-toast';
import type { Comment } from '@/lib/types';

export function useComments(postId: string, options: { enabled?: boolean } = {}) {
  return useQuery<Comment[]>({
    queryKey: ['comments', postId],
    queryFn: async () => {
      if (!postId) return [];
      return socialApi.getComments(postId);
    },
    enabled: options.enabled !== undefined ? options.enabled : Boolean(postId),
    staleTime: 10 * 1000,
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => socialApi.createComment(postId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast({
        title: 'Comment added',
        description: 'Your comment has been posted.',
      });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Comment failed',
        description: error.message || 'Could not post comment',
      });
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => socialApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast({
        title: 'Comment deleted',
        description: 'Comment has been removed.',
      });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: error.message || 'Could not delete comment',
      });
    },
  });
}
