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

export interface CommentUpdatedWsPayload {
  commentId: string;
  postId: string;
  reelId?: string;
  targetType?: 'post' | 'reel';
  body: string;
  editedAt: string;
  mentions?: string[];
  hashtags?: string[];
}

export interface CommentPinnedWsPayload {
  commentId: string;
  postId: string;
  by: string;
  at: string;
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

function updateCommentListBody(
  list: Comment[],
  payload: CommentUpdatedWsPayload
): Comment[] {
  let changed = false;
  const applyPatch = (c: Comment): Comment => ({
    ...c,
    body: payload.body,
    editedAt: payload.editedAt,
    ...(payload.mentions !== undefined ? { mentions: payload.mentions } : {}),
    ...(payload.hashtags !== undefined ? { hashtags: payload.hashtags } : {}),
  });

  const next = list.map((comment) => {
    let nextComment = comment;
    if (comment.id === payload.commentId) {
      changed = true;
      nextComment = applyPatch(nextComment);
    }
    if (comment.topReplies && comment.topReplies.some((r) => r.id === payload.commentId)) {
      changed = true;
      nextComment = {
        ...nextComment,
        topReplies: comment.topReplies.map((reply) =>
          reply.id === payload.commentId ? applyPatch(reply) : reply
        ),
      };
    }
    return nextComment;
  });
  return changed ? next : list;
}

/**
 * Applies a real-time core.comment.updated payload into visible comment & post preview caches.
 */
export function applyCommentUpdatedEvent(
  queryClient: QueryClient,
  payload: CommentUpdatedWsPayload
): void {
  const targetId = payload.reelId || payload.postId;
  if (!payload.commentId) return;

  if (targetId) {
    queryClient.setQueriesData<Comment[]>({ queryKey: ['comments', targetId] }, (old) =>
      Array.isArray(old) ? updateCommentListBody(old, payload) : old
    );
    queryClient.setQueriesData<Comment[]>({ queryKey: ['reel-comments', targetId] }, (old) =>
      Array.isArray(old) ? updateCommentListBody(old, payload) : old
    );

    if (payload.targetType !== 'reel') {
      const updatePostComments = (p: Post): Post =>
        p.id === targetId && Array.isArray(p.comments)
          ? { ...p, comments: updateCommentListBody(p.comments, payload) }
          : p;

      queryClient.setQueryData<Post>(['post', targetId], (old) =>
        old ? updatePostComments(old) : old
      );
      queryClient.setQueriesData<Post[]>({ queryKey: ['posts'] }, (old) =>
        Array.isArray(old) ? old.map(updatePostComments) : old
      );
      queryClient.setQueriesData<any>({ queryKey: ['feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: Array.isArray(page.data) ? page.data.map(updatePostComments) : page.data,
          })),
        };
      });
    }
  }

  queryClient.setQueriesData<Comment[]>({ queryKey: ['comment-replies'] }, (old) =>
    Array.isArray(old) ? updateCommentListBody(old, payload) : old
  );
}

export interface ContentSavePatch {
  savedByViewer?: boolean;
  saveCount?: number;
  saveDelta?: number;
  shareCount?: number;
}

export interface ContentSavedWsPayload {
  postId?: string;
  reelId?: string;
  commentId?: string;
  userId?: string;
  saveCount?: number;
  at?: string;
}

export interface ContentSharedWsPayload {
  contentType: 'post' | 'reel' | 'comment';
  contentId: string;
  byUserId?: string;
  shareCount?: number;
  postId?: string;
  reelId?: string;
  at?: string;
}

function mergeMetricPatch<T extends { saveCount?: number; shareCount?: number; savedByViewer?: boolean }>(
  item: T,
  patch: ContentSavePatch
): T {
  const nextSaveCount =
    typeof patch.saveCount === 'number'
      ? Math.max(0, patch.saveCount)
      : typeof patch.saveDelta === 'number'
      ? Math.max(0, (item.saveCount ?? 0) + patch.saveDelta)
      : item.saveCount;

  return {
    ...item,
    ...(patch.savedByViewer !== undefined ? { savedByViewer: patch.savedByViewer } : {}),
    ...(nextSaveCount !== undefined ? { saveCount: nextSaveCount } : {}),
    ...(typeof patch.shareCount === 'number' ? { shareCount: Math.max(0, patch.shareCount) } : {}),
  };
}

function updateCommentTreePatch(
  list: Comment[],
  commentId: string,
  patch: ContentSavePatch
): Comment[] {
  let changed = false;
  const next = list.map((comment) => {
    let nextComment = comment;
    if (comment.id === commentId) {
      changed = true;
      nextComment = mergeMetricPatch(nextComment, patch);
    }
    if (comment.topReplies && comment.topReplies.some((r) => r.id === commentId)) {
      changed = true;
      nextComment = {
        ...nextComment,
        topReplies: comment.topReplies.map((r) =>
          r.id === commentId ? mergeMetricPatch(r, patch) : r
        ),
      };
    }
    return nextComment;
  });
  return changed ? next : list;
}

/**
 * Patches save/share counters & savedByViewer for a post across all active React Query caches.
 */
export function patchPostInCaches(
  queryClient: QueryClient,
  postId: string,
  patch: ContentSavePatch
): void {
  const mapPost = (p: Post): Post => (p.id === postId ? mergeMetricPatch(p, patch) : p);

  queryClient.setQueryData<Post>(['post', postId], (old) => (old ? mapPost(old) : old));

  for (const key of [['posts'], ['popular-posts']] as const) {
    queryClient.setQueriesData<Post[]>({ queryKey: key }, (old) =>
      Array.isArray(old) ? old.map(mapPost) : old
    );
  }

  queryClient.setQueriesData<any>({ queryKey: ['my-likes'] }, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: Post[]) => (Array.isArray(page) ? page.map(mapPost) : page)),
    };
  });

  queryClient.setQueriesData<any>({ queryKey: ['saved-posts'] }, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: Post[]) => {
        if (!Array.isArray(page)) return page;
        return patch.savedByViewer === false
          ? page.filter((p) => p.id !== postId)
          : page.map(mapPost);
      }),
    };
  });

  for (const key of [['feed'], ['hashtag-posts']] as const) {
    queryClient.setQueriesData<any>({ queryKey: key }, (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          data: Array.isArray(page.data) ? page.data.map(mapPost) : page.data,
        })),
      };
    });
  }
}

/**
 * Patches save/share counters & savedByViewer for a reel across all active React Query caches.
 */
export function patchReelInCaches(
  queryClient: QueryClient,
  reelId: string,
  patch: ContentSavePatch
): void {
  const mapReel = (r: ReelItem): ReelItem => (r.id === reelId ? mergeMetricPatch(r, patch) : r);

  queryClient.setQueryData<ReelItem>(['reel', reelId], (old) => (old ? mapReel(old) : old));

  for (const key of [['reels-feed'], ['user-reels']] as const) {
    queryClient.setQueriesData<any>({ queryKey: key }, (old: any) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          items: Array.isArray(page.items) ? page.items.map(mapReel) : page.items,
        })),
      };
    });
  }

  queryClient.setQueriesData<any>({ queryKey: ['saved-reels'] }, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: ReelItem[]) => {
        if (!Array.isArray(page)) return page;
        return patch.savedByViewer === false
          ? page.filter((r) => r.id !== reelId)
          : page.map(mapReel);
      }),
    };
  });
}

/**
 * Patches save/share counters & savedByViewer for a comment across all active React Query caches.
 */
export function patchCommentInCaches(
  queryClient: QueryClient,
  commentId: string,
  patch: ContentSavePatch
): void {
  for (const key of [['comments'], ['reel-comments'], ['comment-replies']] as const) {
    queryClient.setQueriesData<Comment[]>({ queryKey: key }, (old) =>
      Array.isArray(old) ? updateCommentTreePatch(old, commentId, patch) : old
    );
  }

  queryClient.setQueriesData<any>({ queryKey: ['saved-comments'] }, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: Comment[]) => {
        if (!Array.isArray(page)) return page;
        return patch.savedByViewer === false
          ? page.filter((c) => c.id !== commentId)
          : updateCommentTreePatch(page, commentId, patch);
      }),
    };
  });

  const patchPostComments = (p: Post): Post =>
    Array.isArray(p.comments)
      ? { ...p, comments: updateCommentTreePatch(p.comments, commentId, patch) }
      : p;

  queryClient.setQueriesData<Post>({ queryKey: ['post'] }, (old) =>
    old ? patchPostComments(old) : old
  );
  queryClient.setQueriesData<Post[]>({ queryKey: ['posts'] }, (old) =>
    Array.isArray(old) ? old.map(patchPostComments) : old
  );
  queryClient.setQueriesData<any>({ queryKey: ['feed'] }, (old: any) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((page: any) => ({
        ...page,
        data: Array.isArray(page.data) ? page.data.map(patchPostComments) : page.data,
      })),
    };
  });
}

/**
 * Applies core.{post,reel,comment}.{saved,unsaved} WS updates into local state.
 */
export function applySavedWsEvent(
  queryClient: QueryClient,
  type: 'post' | 'reel' | 'comment',
  saved: boolean,
  payload: ContentSavedWsPayload
): void {
  const patch: ContentSavePatch = {
    savedByViewer: saved,
    ...(typeof payload.saveCount === 'number' ? { saveCount: payload.saveCount } : {}),
  };

  if (type === 'post' && payload.postId) {
    patchPostInCaches(queryClient, payload.postId, patch);
    queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
  } else if (type === 'reel' && payload.reelId) {
    patchReelInCaches(queryClient, payload.reelId, patch);
    queryClient.invalidateQueries({ queryKey: ['saved-reels'] });
  } else if (type === 'comment' && payload.commentId) {
    patchCommentInCaches(queryClient, payload.commentId, patch);
    queryClient.invalidateQueries({ queryKey: ['saved-comments'] });
  }
}

/**
 * Applies core.content.shared WS updates across active caches.
 */
export function applyContentSharedWsEvent(
  queryClient: QueryClient,
  payload: ContentSharedWsPayload
): void {
  if (typeof payload.shareCount !== 'number' || !payload.contentId) return;
  const patch: ContentSavePatch = { shareCount: payload.shareCount };

  if (payload.contentType === 'post') {
    patchPostInCaches(queryClient, payload.contentId, patch);
  } else if (payload.contentType === 'reel') {
    patchReelInCaches(queryClient, payload.contentId, patch);
  } else if (payload.contentType === 'comment') {
    patchCommentInCaches(queryClient, payload.contentId, patch);
  }
}
