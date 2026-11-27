import type { QueryClient } from '@tanstack/react-query';
import type { Comment, Post, ReelItem } from './types';

export interface CommentRepliedWsPayload {
  commentId: string;
  parentCommentId: string;
  postId: string;
  reelId?: string;
  targetType?: 'post' | 'reel';
  commentAuthorId: string;
  parentAuthorId: string;
  reply?: Comment;
  replyCount?: number;
  at: string;
}

export interface CommentLikedWsPayload {
  commentId: string;
  postId: string;
  reelId?: string;
  targetType?: 'post' | 'reel';
  userId: string;
  commentAuthorId: string;
  parentCommentId?: string | null;
  likeCount?: number;
  delta?: number;
  at: string;
}

export interface CommentDeletedWsPayload {
  commentId: string;
  postId: string;
  reelId?: string;
  targetType?: 'post' | 'reel';
  parentCommentId?: string | null;
  commentAuthorId?: string;
  keepPlaceholder?: boolean;
  at?: string;
}

function updateCommentListLike(
  list: Comment[],
  commentId: string,
  nextCountFn: (current: number) => number
): Comment[] {
  let changed = false;
  const nextList = list.map((comment) => {
    let nextComment = comment;
    if (comment.id === commentId) {
      changed = true;
      nextComment = {
        ...nextComment,
        likeCount: nextCountFn(comment.likeCount ?? 0),
      };
    }
    if (comment.topReplies && comment.topReplies.some((r) => r.id === commentId)) {
      changed = true;
      nextComment = {
        ...nextComment,
        topReplies: comment.topReplies.map((reply) =>
          reply.id === commentId
            ? { ...reply, likeCount: nextCountFn(reply.likeCount ?? 0) }
            : reply
        ),
      };
    }
    return nextComment;
  });
  return changed ? nextList : list;
}

export function adjustTargetCommentCount(
  queryClient: QueryClient,
  targetId: string,
  targetType: 'post' | 'reel',
  delta: number
): void {
  if (targetType === 'reel') {
    queryClient.setQueryData<ReelItem>(['reel', targetId], (old) =>
      old ? { ...old, commentCount: Math.max(0, old.commentCount + delta) } : old
    );
    queryClient.setQueriesData<any>({ queryKey: ['reels-feed'] }, (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          items: Array.isArray(page.items)
            ? page.items.map((item: ReelItem) =>
                item.id === targetId
                  ? { ...item, commentCount: Math.max(0, item.commentCount + delta) }
                  : item
              )
            : page.items,
        })),
      };
    });
    return;
  }

  queryClient.setQueryData<Post>(['post', targetId], (old) =>
    old ? { ...old, commentCount: Math.max(0, old.commentCount + delta) } : old
  );
  queryClient.setQueriesData<Post[]>({ queryKey: ['posts'] }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((p) =>
      p.id === targetId ? { ...p, commentCount: Math.max(0, p.commentCount + delta) } : p
    );
  });
  queryClient.setQueriesData<any>({ queryKey: ['feed'] }, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        data: Array.isArray(page.data)
          ? page.data.map((p: Post) =>
              p.id === targetId ? { ...p, commentCount: Math.max(0, p.commentCount + delta) } : p
            )
          : page.data,
      })),
    };
  });
}

/**
 * Applies a real-time core.comment.replied WS payload into visible React Query comment caches.
 */
export function applyCommentRepliedEvent(
  queryClient: QueryClient,
  payload: CommentRepliedWsPayload
): void {
  const targetId = payload.reelId || payload.postId;
  if (!targetId || !payload.parentCommentId) return;

  const isReel = payload.targetType === 'reel';
  const listKeyPrefix = isReel ? ['reel-comments', targetId] : ['comments', targetId];

  const existingLists = queryClient.getQueriesData<Comment[]>({ queryKey: listKeyPrefix });
  const hasVisibleCache = existingLists.some(([, data]) => Array.isArray(data));

  if (!hasVisibleCache) {
    // Still bump counts on visible feed/detail cards if present
    adjustTargetCommentCount(queryClient, targetId, isReel ? 'reel' : 'post', 1);
    return;
  }

  let matchedParent = false;
  let incremented = false;

  queryClient.setQueriesData<Comment[]>({ queryKey: listKeyPrefix }, (old) => {
    if (!Array.isArray(old)) return old;
    return old.map((comment) => {
      if (comment.id !== payload.parentCommentId) return comment;
      matchedParent = true;

      const existingReplies = comment.topReplies ?? [];
      const alreadyPresent = existingReplies.some((r) => r.id === payload.commentId);
      if (alreadyPresent) return comment;

      incremented = true;
      const nextReplyCount =
        typeof payload.replyCount === 'number'
          ? Math.max((comment.replyCount ?? 0) + 1, payload.replyCount)
          : (comment.replyCount ?? 0) + 1;

      const nextTopReplies =
        payload.reply && existingReplies.length < 3
          ? [...existingReplies, payload.reply]
          : existingReplies;

      return {
        ...comment,
        replyCount: nextReplyCount,
        topReplies: nextTopReplies,
      };
    });
  });

  if (payload.reply) {
    queryClient.setQueryData<Comment[]>(['comment-replies', payload.parentCommentId], (old) => {
      if (!Array.isArray(old)) return old;
      if (old.some((r) => r.id === payload.commentId)) return old;
      incremented = true;
      return [payload.reply!, ...old];
    });
  } else if (matchedParent) {
    queryClient.invalidateQueries({ queryKey: ['comment-replies', payload.parentCommentId] });
  }

  if (incremented) {
    adjustTargetCommentCount(queryClient, targetId, isReel ? 'reel' : 'post', 1);
  }
}

/**
 * Applies a real-time core.comment.liked or core.comment.unliked WS payload into visible caches.
 */
export function applyCommentLikeEvent(
  queryClient: QueryClient,
  payload: CommentLikedWsPayload
): void {
  const targetId = payload.reelId || payload.postId;
  if (!payload.commentId) return;

  const resolveNextCount = (current: number): number => {
    if (typeof payload.likeCount === 'number') {
      return Math.max(0, payload.likeCount);
    }
    return Math.max(0, current + (payload.delta ?? 0));
  };

  if (targetId) {
    const isReel = payload.targetType === 'reel';
    queryClient.setQueriesData<Comment[]>(
      { queryKey: isReel ? ['reel-comments', targetId] : ['comments', targetId] },
      (old) => (Array.isArray(old) ? updateCommentListLike(old, payload.commentId, resolveNextCount) : old)
    );
    // Also check opposite prefix in case targetType wasn't sent over WS
    queryClient.setQueriesData<Comment[]>(
      { queryKey: isReel ? ['comments', targetId] : ['reel-comments', targetId] },
      (old) => (Array.isArray(old) ? updateCommentListLike(old, payload.commentId, resolveNextCount) : old)
    );
  }

  queryClient.setQueriesData<Comment[]>({ queryKey: ['comment-replies'] }, (old) =>
    Array.isArray(old) ? updateCommentListLike(old, payload.commentId, resolveNextCount) : old
  );
}

/**
 * Applies a real-time core.comment.deleted WS payload into visible caches.
 */
export function applyCommentDeletedEvent(
  queryClient: QueryClient,
  payload: CommentDeletedWsPayload
): void {
  const targetId = payload.reelId || payload.postId;
  if (!payload.commentId) return;

  const updateList = (old: Comment[] | undefined): Comment[] | undefined => {
    if (!Array.isArray(old)) return old;
    if (payload.keepPlaceholder) {
      return old.map((c) =>
        c.id === payload.commentId ? { ...c, deleted: true, body: '[deleted]' } : c
      );
    }
    return old
      .filter((c) => c.id !== payload.commentId)
      .map((c) => {
        const hadTopReply = (c.topReplies ?? []).some((r) => r.id === payload.commentId);
        const matchesParent = payload.parentCommentId && c.id === payload.parentCommentId;
        if (!hadTopReply && !matchesParent) return c;
        return {
          ...c,
          replyCount: Math.max(0, (c.replyCount ?? 0) - 1),
          topReplies: (c.topReplies ?? []).filter((r) => r.id !== payload.commentId),
        };
      });
  };

  if (targetId) {
    queryClient.setQueriesData<Comment[]>({ queryKey: ['comments', targetId] }, updateList);
    queryClient.setQueriesData<Comment[]>({ queryKey: ['reel-comments', targetId] }, updateList);
  }
  queryClient.setQueriesData<Comment[]>({ queryKey: ['comment-replies'] }, (old) =>
    Array.isArray(old) ? old.filter((r) => r.id !== payload.commentId) : old
  );
}
