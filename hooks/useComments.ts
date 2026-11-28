'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '@/lib/social-api';
import { reelsApi } from '@/lib/reels-api';
import {
  adjustTargetCommentCount,
  applyCommentLikeEvent,
  applyCommentReactionEvent,
  applyCommentUpdatedEvent,
  patchCommentInCaches,
} from '@/lib/comment-cache';
import { toast } from '@/components/ui/use-toast';
import type { Comment } from '@/lib/types';

export type CommentTargetType = 'post' | 'reel';
export type CommentSortOrder = 'top' | 'new';

export interface CreateCommentVariables {
  body: string;
  parentCommentId?: string | null;
}

export function commentsQueryPrefix(targetId: string, targetType: CommentTargetType = 'post') {
  return targetType === 'reel'
    ? (['reel-comments', targetId] as const)
    : (['comments', targetId] as const);
}

export function useComments(
  targetId: string,
  options: {
    enabled?: boolean;
    sort?: CommentSortOrder;
    targetType?: CommentTargetType;
  } = {}
) {
  const targetType = options.targetType ?? 'post';
  const sort = options.sort ?? 'top';

  return useQuery<Comment[]>({
    queryKey: [...commentsQueryPrefix(targetId, targetType), sort],
    queryFn: async () => {
      if (!targetId) return [];
      if (targetType === 'reel') {
        const items = await reelsApi.getComments(targetId, 20, undefined, sort);
        return items as unknown as Comment[];
      }
      return socialApi.getComments(targetId, { limit: 20, sort });
    },
    enabled: options.enabled !== undefined ? options.enabled : Boolean(targetId),
    staleTime: 10 * 1000,
  });
}

export function useCommentReplies(commentId: string, enabled: boolean = false) {
  return useQuery<Comment[]>({
    queryKey: ['comment-replies', commentId],
    queryFn: async () => {
      if (!commentId) return [];
      return socialApi.getCommentReplies(commentId, { limit: 50 });
    },
    enabled: Boolean(commentId) && enabled,
    staleTime: 10 * 1000,
  });
}

export function useCreateComment(
  targetId: string,
  targetType: CommentTargetType = 'post'
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: string | CreateCommentVariables) => {
      const { body, parentCommentId } =
        typeof input === 'string' ? { body: input, parentCommentId: undefined } : input;

      if (targetType === 'reel') {
        const created = await reelsApi.createComment(targetId, body, parentCommentId);
        return created as unknown as Comment;
      }
      return socialApi.createComment(targetId, body, parentCommentId);
    },
    onSuccess: (created, variables) => {
      const parentId =
        created.parentCommentId ??
        (typeof variables === 'string' ? null : variables.parentCommentId ?? null);
      const listPrefix = commentsQueryPrefix(targetId, targetType);

      if (parentId) {
        queryClient.setQueriesData<Comment[]>({ queryKey: listPrefix }, (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((comment) => {
            if (comment.id !== parentId) return comment;
            const currentTop = comment.topReplies ?? [];
            if (currentTop.some((r) => r.id === created.id)) return comment;
            return {
              ...comment,
              replyCount: (comment.replyCount ?? 0) + 1,
              topReplies: currentTop.length < 3 ? [...currentTop, created] : currentTop,
            };
          });
        });

        queryClient.setQueryData<Comment[]>(['comment-replies', parentId], (old) => {
          if (!Array.isArray(old)) return old;
          if (old.some((r) => r.id === created.id)) return old;
          return [created, ...old];
        });
        queryClient.invalidateQueries({ queryKey: ['comment-replies', parentId] });
      }

      adjustTargetCommentCount(queryClient, targetId, targetType, 1);
      queryClient.invalidateQueries({ queryKey: listPrefix });

      if (targetType === 'post') {
        queryClient.invalidateQueries({ queryKey: ['post', targetId] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        toast({
          title: parentId ? 'Reply added' : 'Comment added',
          description: parentId ? 'Your reply has been posted.' : 'Your comment has been posted.',
        });
      } else {
        queryClient.invalidateQueries({ queryKey: ['reel', targetId] });
      }
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

export function useToggleCommentLike(
  targetId: string,
  targetType: CommentTargetType = 'post'
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      currentlyLiked,
    }: {
      commentId: string;
      currentlyLiked: boolean;
    }) => {
      if (currentlyLiked) {
        await socialApi.unlikeComment(commentId);
      } else {
        await socialApi.likeComment(commentId);
      }
      return { commentId, liked: !currentlyLiked };
    },
    onMutate: async ({ commentId, currentlyLiked }) => {
      const listPrefix = commentsQueryPrefix(targetId, targetType);
      await queryClient.cancelQueries({ queryKey: listPrefix });

      const delta = currentlyLiked ? -1 : 1;
      const updateViewerLike = (list: Comment[] | undefined): Comment[] | undefined => {
        if (!Array.isArray(list)) return list;
        return list.map((comment) => {
          let next = comment;
          if (comment.id === commentId) {
            next = {
              ...next,
              likedByViewer: !currentlyLiked,
              likeCount: Math.max(0, (comment.likeCount ?? 0) + delta),
            };
          }
          if (comment.topReplies && comment.topReplies.some((r) => r.id === commentId)) {
            next = {
              ...next,
              topReplies: comment.topReplies.map((reply) =>
                reply.id === commentId
                  ? {
                      ...reply,
                      likedByViewer: !currentlyLiked,
                      likeCount: Math.max(0, (reply.likeCount ?? 0) + delta),
                    }
                  : reply
              ),
            };
          }
          return next;
        });
      };

      const prevLists = queryClient.getQueriesData<Comment[]>({ queryKey: listPrefix });
      const prevReplies = queryClient.getQueriesData<Comment[]>({ queryKey: ['comment-replies'] });

      queryClient.setQueriesData<Comment[]>({ queryKey: listPrefix }, updateViewerLike);
      queryClient.setQueriesData<Comment[]>({ queryKey: ['comment-replies'] }, updateViewerLike);

      return { prevLists, prevReplies };
    },
    onError: (error: { message?: string }, _vars, context) => {
      if (context) {
        for (const [key, data] of context.prevLists) {
          queryClient.setQueryData(key, data);
        }
        for (const [key, data] of context.prevReplies) {
          queryClient.setQueryData(key, data);
        }
      }
      toast({
        variant: 'destructive',
        title: 'Like failed',
        description: error?.message || 'Could not update comment like.',
      });
    },
    onSettled: (_data, _err, vars) => {
      applyCommentLikeEvent(queryClient, {
        commentId: vars.commentId,
        postId: targetId,
        targetType,
        userId: '',
        commentAuthorId: '',
        at: new Date().toISOString(),
        delta: 0,
      });
    },
  });
}

export function useDeleteComment(
  targetId: string,
  targetType: CommentTargetType = 'post'
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => socialApi.deleteComment(commentId),
    onSuccess: (_void, commentId) => {
      const listPrefix = commentsQueryPrefix(targetId, targetType);
      adjustTargetCommentCount(queryClient, targetId, targetType, -1);

      queryClient.setQueriesData<Comment[]>({ queryKey: listPrefix }, (old) => {
        if (!Array.isArray(old)) return old;
        return old
          .map((comment) => {
            if (comment.id === commentId && (comment.replyCount ?? 0) > 0) {
              return { ...comment, deleted: true, body: '[deleted]' };
            }
            if (comment.topReplies?.some((r) => r.id === commentId)) {
              return {
                ...comment,
                replyCount: Math.max(0, (comment.replyCount ?? 0) - 1),
                topReplies: comment.topReplies.filter((r) => r.id !== commentId),
              };
            }
            return comment;
          })
          .filter((comment) => comment.id !== commentId || (comment.replyCount ?? 0) > 0);
      });

      queryClient.setQueriesData<Comment[]>({ queryKey: ['comment-replies'] }, (old) =>
        Array.isArray(old) ? old.filter((r) => r.id !== commentId) : old
      );

      queryClient.invalidateQueries({ queryKey: listPrefix });
      queryClient.invalidateQueries({ queryKey: ['comment-replies'] });

      if (targetType === 'post') {
        queryClient.invalidateQueries({ queryKey: ['post', targetId] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['reel', targetId] });
      }

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

export function useEditComment(
  targetId: string,
  targetType: CommentTargetType = 'post'
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      socialApi.editComment(commentId, body),
    onSuccess: (updated) => {
      const listPrefix = commentsQueryPrefix(targetId, targetType);
      applyCommentUpdatedEvent(queryClient, {
        commentId: updated.id,
        postId: targetId,
        targetType,
        body: updated.body,
        editedAt: updated.editedAt ?? new Date().toISOString(),
        mentions: updated.mentions,
        hashtags: updated.hashtags,
      });
      queryClient.invalidateQueries({ queryKey: listPrefix });
      queryClient.invalidateQueries({ queryKey: ['comment-replies'] });

      if (targetType === 'post') {
        queryClient.invalidateQueries({ queryKey: ['post', targetId] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        toast({
          title: 'Comment updated',
          description: 'Your changes have been saved.',
        });
      }
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error.message || 'Could not update comment',
      });
    },
  });
}

export function usePinComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => socialApi.pinComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast({
        title: 'Comment pinned',
        description: 'This comment is now pinned to the top.',
      });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Could not pin comment',
        description: error.message || 'Failed to pin comment',
      });
    },
  });
}

export function useUnpinComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => socialApi.unpinComment(postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
      toast({
        title: 'Comment unpinned',
        description: 'Comment unpinned from top.',
      });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Could not unpin comment',
        description: error.message || 'Failed to unpin comment',
      });
    },
  });
}

export function useToggleCommentReaction(
  targetId: string,
  targetType: CommentTargetType = 'post',
  currentUserId?: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      emoji,
      hasReacted,
    }: {
      commentId: string;
      emoji: string;
      hasReacted: boolean;
    }) =>
      hasReacted
        ? socialApi.removeCommentReaction(commentId, emoji)
        : socialApi.addCommentReaction(commentId, emoji),
    onMutate: async ({ commentId, emoji, hasReacted }) => {
      const listPrefix = commentsQueryPrefix(targetId, targetType);
      await queryClient.cancelQueries({ queryKey: listPrefix });
      await queryClient.cancelQueries({ queryKey: ['comment-replies'] });

      const prevLists = queryClient.getQueriesData<Comment[]>({ queryKey: listPrefix });
      const prevReplies = queryClient.getQueriesData<Comment[]>({ queryKey: ['comment-replies'] });

      if (currentUserId) {
        applyCommentReactionEvent(
          queryClient,
          {
            commentId,
            postId: targetType === 'post' ? targetId : undefined,
            reelId: targetType === 'reel' ? targetId : undefined,
            targetType,
            emoji,
            userId: currentUserId,
          },
          !hasReacted
        );
      }

      return { prevLists, prevReplies };
    },
    onError: (error: { message?: string }, _vars, context) => {
      if (context) {
        for (const [key, data] of context.prevLists) {
          queryClient.setQueryData(key, data);
        }
        for (const [key, data] of context.prevReplies) {
          queryClient.setQueryData(key, data);
        }
      }
      toast({
        variant: 'destructive',
        title: 'Reaction failed',
        description: error?.message || 'Could not update comment reaction.',
      });
    },
    onSuccess: (data, vars) => {
      patchCommentInCaches(queryClient, vars.commentId, { reactions: data.reactions });
    },
  });
}
