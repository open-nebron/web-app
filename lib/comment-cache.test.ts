import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  applyCommentDeletedEvent,
  applyCommentLikeEvent,
  applyCommentReactionEvent,
  applyCommentRepliedEvent,
  applyCommentUpdatedEvent,
} from './comment-cache';
import type { Comment, Post } from './types';

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c1',
    postId: 'p1',
    parentCommentId: null,
    body: 'Hello',
    likeCount: 0,
    replyCount: 0,
    likedByViewer: false,
    deleted: false,
    createdAt: '2026-11-27T10:00:00.000Z',
    author: { userId: 'u1', username: 'alice', name: 'Alice', avatarUrl: null },
    topReplies: [],
    ...overrides,
  };
}

describe('comment-cache WS helpers (V4-1)', () => {
  it('adds reply to topReplies when <=3, caps topReplies at 3 while incrementing replyCount', () => {
    const qc = new QueryClient();
    const post: Post = {
      id: 'p1',
      body: 'Post body',
      likeCount: 0,
      commentCount: 1,
      likedByViewer: false,
      createdAt: '2026-11-27T09:00:00.000Z',
      author: { userId: 'u1', username: 'alice', name: 'Alice', avatarUrl: null },
    };
    qc.setQueryData(['post', 'p1'], post);
    qc.setQueryData<Comment[]>(['comments', 'p1', 'top'], [makeComment()]);

    for (let i = 1; i <= 4; i++) {
      const reply = makeComment({
        id: `r${i}`,
        parentCommentId: 'c1',
        body: `Reply ${i}`,
        createdAt: `2026-11-27T10:0${i}:00.000Z`,
      });
      applyCommentRepliedEvent(qc, {
        commentId: reply.id,
        parentCommentId: 'c1',
        postId: 'p1',
        commentAuthorId: 'u2',
        parentAuthorId: 'u1',
        reply,
        replyCount: i,
        at: reply.createdAt,
      });
    }

    const cached = qc.getQueryData<Comment[]>(['comments', 'p1', 'top'])!;
    expect(cached[0].replyCount).toBe(4);
    expect(cached[0].topReplies?.length).toBe(3);
    expect(cached[0].topReplies?.map((r) => r.id)).toEqual(['r1', 'r2', 'r3']);

    // Duplicate delivery for existing reply id is idempotent
    applyCommentRepliedEvent(qc, {
      commentId: 'r1',
      parentCommentId: 'c1',
      postId: 'p1',
      commentAuthorId: 'u2',
      parentAuthorId: 'u1',
      reply: makeComment({ id: 'r1', parentCommentId: 'c1' }),
      replyCount: 4,
      at: '2026-11-27T10:01:00.000Z',
    });
    expect(qc.getQueryData<Comment[]>(['comments', 'p1', 'top'])![0].replyCount).toBe(4);
    expect(qc.getQueryData<Post>(['post', 'p1'])?.commentCount).toBe(5);
  });

  it('updates likeCount on both top-level comments and nested topReplies via WS events', () => {
    const qc = new QueryClient();
    const reply = makeComment({ id: 'r1', parentCommentId: 'c1', likeCount: 1 });
    qc.setQueryData<Comment[]>(['comments', 'p1', 'top'], [
      makeComment({ id: 'c1', likeCount: 2, topReplies: [reply] }),
    ]);

    applyCommentLikeEvent(qc, {
      commentId: 'c1',
      postId: 'p1',
      userId: 'u2',
      commentAuthorId: 'u1',
      likeCount: 3,
      at: '2026-11-27T10:05:00.000Z',
    });
    applyCommentLikeEvent(qc, {
      commentId: 'r1',
      postId: 'p1',
      userId: 'u3',
      commentAuthorId: 'u2',
      likeCount: 2,
      at: '2026-11-27T10:06:00.000Z',
    });

    const cached = qc.getQueryData<Comment[]>(['comments', 'p1', 'top'])!;
    expect(cached[0].likeCount).toBe(3);
    expect(cached[0].topReplies?.[0].likeCount).toBe(2);
  });

  it('handles deleted parent placeholder vs reply removal', () => {
    const qc = new QueryClient();
    const r1 = makeComment({ id: 'r1', parentCommentId: 'c1' });
    qc.setQueryData<Comment[]>(['comments', 'p1', 'top'], [
      makeComment({ id: 'c1', replyCount: 1, topReplies: [r1] }),
    ]);

    applyCommentDeletedEvent(qc, {
      commentId: 'c1',
      postId: 'p1',
      keepPlaceholder: true,
    });
    let cached = qc.getQueryData<Comment[]>(['comments', 'p1', 'top'])!;
    expect(cached.length).toBe(1);
    expect(cached[0].deleted).toBe(true);
    expect(cached[0].body).toBe('[deleted]');
    expect(cached[0].topReplies?.length).toBe(1);

    applyCommentDeletedEvent(qc, {
      commentId: 'r1',
      postId: 'p1',
      parentCommentId: 'c1',
    });
    cached = qc.getQueryData<Comment[]>(['comments', 'p1', 'top'])!;
    expect(cached[0].topReplies?.length).toBe(0);
    expect(cached[0].replyCount).toBe(0);
  });

  it('updates body, editedAt, mentions, and hashtags via core.comment.updated event', () => {
    const qc = new QueryClient();
    const reply = makeComment({ id: 'r1', parentCommentId: 'c1', body: 'Old reply' });
    const root = makeComment({ id: 'c1', body: 'Old root', topReplies: [reply] });

    qc.setQueryData<Comment[]>(['comments', 'p1', 'top'], [root]);
    qc.setQueryData<Comment[]>(['comment-replies', 'c1'], [reply]);
    qc.setQueryData<Post>(['post', 'p1'], {
      id: 'p1',
      body: 'Post body',
      likeCount: 0,
      commentCount: 2,
      likedByViewer: false,
      createdAt: '2026-11-27T09:00:00.000Z',
      author: { userId: 'u1', username: 'alice', name: 'Alice', avatarUrl: null },
      comments: [root],
    });

    applyCommentUpdatedEvent(qc, {
      commentId: 'c1',
      postId: 'p1',
      body: 'Edited root @bob #news',
      editedAt: '2026-11-27T11:00:00.000Z',
      mentions: ['u2'],
      hashtags: ['news'],
    });

    applyCommentUpdatedEvent(qc, {
      commentId: 'r1',
      postId: 'p1',
      body: 'Edited reply',
      editedAt: '2026-11-27T11:01:00.000Z',
    });

    const cachedList = qc.getQueryData<Comment[]>(['comments', 'p1', 'top'])!;
    expect(cachedList[0].body).toBe('Edited root @bob #news');
    expect(cachedList[0].editedAt).toBe('2026-11-27T11:00:00.000Z');
    expect(cachedList[0].mentions).toEqual(['u2']);
    expect(cachedList[0].hashtags).toEqual(['news']);
    expect(cachedList[0].topReplies?.[0].body).toBe('Edited reply');

    const cachedReplies = qc.getQueryData<Comment[]>(['comment-replies', 'c1'])!;
    expect(cachedReplies[0].body).toBe('Edited reply');

    const cachedPost = qc.getQueryData<Post>(['post', 'p1'])!;
    expect(cachedPost.comments?.[0].body).toBe('Edited root @bob #news');
  });

  it('updates comment reaction summaries across lists, replies, and post previews (V4.5-1)', () => {
    const qc = new QueryClient();
    const fire = '\u{1F525}';
    const heart = '\u{2764}\u{FE0F}';
    const reply = makeComment({ id: 'r1', parentCommentId: 'c1' });
    const root = makeComment({ id: 'c1', topReplies: [reply] });

    qc.setQueryData<Comment[]>(['comments', 'p1', 'top'], [root]);
    qc.setQueryData<Comment[]>(['comment-replies', 'c1'], [reply]);
    qc.setQueryData<Post>(['post', 'p1'], {
      id: 'p1',
      body: 'Post body',
      likeCount: 0,
      commentCount: 2,
      likedByViewer: false,
      createdAt: '2026-11-27T09:00:00.000Z',
      author: { userId: 'u1', username: 'alice', name: 'Alice', avatarUrl: null },
      comments: [root],
    });

    // Server-authoritative summary update
    applyCommentReactionEvent(
      qc,
      {
        commentId: 'c1',
        postId: 'p1',
        emoji: fire,
        userId: 'u2',
        reactions: [{ emoji: fire, count: 1, userIds: ['u2'] }],
      },
      true
    );
    expect(qc.getQueryData<Comment[]>(['comments', 'p1', 'top'])![0].reactions).toEqual([
      { emoji: fire, count: 1, userIds: ['u2'] },
    ]);
    expect(qc.getQueryData<Post>(['post', 'p1'])!.comments![0].reactions).toEqual([
      { emoji: fire, count: 1, userIds: ['u2'] },
    ]);

    // Optimistic fallback without summary payload on reply
    applyCommentReactionEvent(
      qc,
      {
        commentId: 'r1',
        postId: 'p1',
        emoji: heart,
        userId: 'u3',
      },
      true
    );
    expect(qc.getQueryData<Comment[]>(['comment-replies', 'c1'])![0].reactions).toEqual([
      { emoji: heart, count: 1, userIds: ['u3'] },
    ]);

    applyCommentReactionEvent(
      qc,
      {
        commentId: 'r1',
        postId: 'p1',
        emoji: heart,
        userId: 'u3',
      },
      false
    );
    expect(qc.getQueryData<Comment[]>(['comment-replies', 'c1'])![0].reactions).toEqual([]);
  });
});
