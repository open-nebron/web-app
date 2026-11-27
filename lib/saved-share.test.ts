import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { socialApi } from './social-api';
import { reelsApi } from './reels-api';
import * as apiModule from './api';
import { buildSocialShareUrls, getFallbackShareUrl } from './share-utils';
import { applyContentSharedWsEvent, applySavedWsEvent } from './comment-cache';
import type { Comment, Post, ReelItem } from './types';

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    body: 'Post body',
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    shareCount: 0,
    likedByViewer: false,
    savedByViewer: false,
    createdAt: '2026-11-27T10:00:00.000Z',
    author: { userId: 'u1', username: 'alice', name: 'Alice', avatarUrl: null },
    ...overrides,
  };
}

function makeReel(overrides: Partial<ReelItem> = {}): ReelItem {
  return {
    id: 'r1',
    authorId: 'u1',
    caption: 'Reel caption',
    videoUrl: 'https://cdn.example.com/r1.mp4',
    thumbnailUrl: null,
    duration: 15,
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    shareCount: 0,
    likedByMe: false,
    savedByViewer: false,
    createdAt: '2026-11-27T10:00:00.000Z',
    updatedAt: '2026-11-27T10:00:00.000Z',
    author: { userId: 'u1', username: 'alice', name: 'Alice', avatarUrl: null, isFollowing: false },
    ...overrides,
  };
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c1',
    postId: 'p1',
    parentCommentId: null,
    body: 'Nice post!',
    likeCount: 0,
    replyCount: 0,
    saveCount: 0,
    shareCount: 0,
    likedByViewer: false,
    savedByViewer: false,
    createdAt: '2026-11-27T10:00:00.000Z',
    author: { userId: 'u1', username: 'alice', name: 'Alice', avatarUrl: null },
    ...overrides,
  };
}

describe('V4-3 Saves & Share Frontend Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls post, reel, comment save/unsave & share endpoints cleanly', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValue(undefined as any);

    await socialApi.savePost('p1');
    expect(spy).toHaveBeenCalledWith('/api/core/posts/p1/save', { method: 'POST' });

    await socialApi.unsavePost('p1');
    expect(spy).toHaveBeenCalledWith('/api/core/posts/p1/save', { method: 'DELETE' });

    await socialApi.getSavedPosts({ limit: 20, before: '2026-11-27T12:00:00.000Z' });
    expect(spy).toHaveBeenCalledWith(
      '/api/core/users/me/saved/posts?limit=20&before=2026-11-27T12%3A00%3A00.000Z'
    );

    await reelsApi.saveReel('r1');
    expect(spy).toHaveBeenCalledWith('/api/core/reels/r1/save', { method: 'POST' });

    await reelsApi.unsaveReel('r1');
    expect(spy).toHaveBeenCalledWith('/api/core/reels/r1/save', { method: 'DELETE' });

    await reelsApi.getSavedReels({ limit: 10 });
    expect(spy).toHaveBeenCalledWith('/api/core/users/me/saved/reels?limit=10');

    await socialApi.saveComment('c1');
    expect(spy).toHaveBeenCalledWith('/api/core/comments/c1/save', { method: 'POST' });

    await socialApi.unsaveComment('c1');
    expect(spy).toHaveBeenCalledWith('/api/core/comments/c1/save', { method: 'DELETE' });

    await socialApi.shareContent('post', 'p1');
    expect(spy).toHaveBeenCalledWith('/api/core/share', {
      method: 'POST',
      body: JSON.stringify({ contentType: 'post', contentId: 'p1' }),
    });
  });

  it('builds fallback canonical URLs and external share links for WhatsApp, Telegram, Twitter', () => {
    const postUrl = getFallbackShareUrl('post', 'p99', { origin: 'https://nebron.app' });
    expect(postUrl).toBe('https://nebron.app/posts/p99');

    const reelUrl = getFallbackShareUrl('reel', 'r99', { origin: 'https://nebron.app' });
    expect(reelUrl).toBe('https://nebron.app/reels/r99');

    const commentUrl = getFallbackShareUrl('comment', 'c99', {
      parentId: 'p99',
      parentType: 'post',
      origin: 'https://nebron.app',
    });
    expect(commentUrl).toBe('https://nebron.app/posts/p99#comment-c99');

    const social = buildSocialShareUrls(postUrl, 'Hello Nebron!');
    expect(social.whatsapp).toContain('https://wa.me/?text=');
    expect(social.whatsapp).toContain(encodeURIComponent(postUrl));
    expect(social.telegram).toContain('https://t.me/share/url?url=');
    expect(social.twitter).toContain('https://twitter.com/intent/tweet?url=');
  });

  it('updates local caches via applySavedWsEvent across posts, reels, comments, and removes unsaved entries from saved lists', () => {
    const qc = new QueryClient();
    qc.setQueryData(['post', 'p1'], makePost({ id: 'p1', saveCount: 0, savedByViewer: false }));
    qc.setQueryData(['saved-posts'], {
      pages: [[makePost({ id: 'p1', savedByViewer: true, saveCount: 1 })]],
      pageParams: [undefined],
    });
    qc.setQueryData(['reel', 'r1'], makeReel({ id: 'r1', saveCount: 0, savedByViewer: false }));
    qc.setQueryData(['comments', 'p1', 'top'], [makeComment({ id: 'c1', saveCount: 0, savedByViewer: false })]);

    applySavedWsEvent(qc, 'post', true, { postId: 'p1', userId: 'u2', saveCount: 1 });
    expect(qc.getQueryData<Post>(['post', 'p1'])?.savedByViewer).toBe(true);
    expect(qc.getQueryData<Post>(['post', 'p1'])?.saveCount).toBe(1);

    applySavedWsEvent(qc, 'post', false, { postId: 'p1', userId: 'u2', saveCount: 0 });
    expect(qc.getQueryData<Post>(['post', 'p1'])?.savedByViewer).toBe(false);
    expect(qc.getQueryData<Post>(['post', 'p1'])?.saveCount).toBe(0);
    expect(qc.getQueryData<{ pages: Post[][] }>(['saved-posts'])?.pages[0]).toEqual([]);

    applySavedWsEvent(qc, 'reel', true, { reelId: 'r1', userId: 'u2', saveCount: 3 });
    expect(qc.getQueryData<ReelItem>(['reel', 'r1'])?.savedByViewer).toBe(true);
    expect(qc.getQueryData<ReelItem>(['reel', 'r1'])?.saveCount).toBe(3);

    applySavedWsEvent(qc, 'comment', true, { commentId: 'c1', userId: 'u2', saveCount: 2 });
    expect(qc.getQueryData<Comment[]>(['comments', 'p1', 'top'])?.[0].savedByViewer).toBe(true);
    expect(qc.getQueryData<Comment[]>(['comments', 'p1', 'top'])?.[0].saveCount).toBe(2);
  });

  it('updates shareCount across posts, reels, and comments via applyContentSharedWsEvent', () => {
    const qc = new QueryClient();
    qc.setQueryData(['post', 'p1'], makePost({ id: 'p1', shareCount: 0 }));
    qc.setQueryData(['reel', 'r1'], makeReel({ id: 'r1', shareCount: 1 }));
    qc.setQueryData(['comments', 'p1', 'top'], [makeComment({ id: 'c1', shareCount: 0 })]);

    applyContentSharedWsEvent(qc, { contentType: 'post', contentId: 'p1', shareCount: 5 });
    applyContentSharedWsEvent(qc, { contentType: 'reel', contentId: 'r1', shareCount: 4 });
    applyContentSharedWsEvent(qc, { contentType: 'comment', contentId: 'c1', shareCount: 2 });

    expect(qc.getQueryData<Post>(['post', 'p1'])?.shareCount).toBe(5);
    expect(qc.getQueryData<ReelItem>(['reel', 'r1'])?.shareCount).toBe(4);
    expect(qc.getQueryData<Comment[]>(['comments', 'p1', 'top'])?.[0].shareCount).toBe(2);
  });
});
