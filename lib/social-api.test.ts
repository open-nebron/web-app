import { describe, it, expect, vi, beforeEach } from 'vitest';
import { socialApi } from './social-api';
import * as apiModule from './api';

describe('Social API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Follow / Unfollow', () => {
    it('calls POST /api/core/users/:userId/follow', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(undefined);
      await socialApi.follow('user-123');
      expect(spy).toHaveBeenCalledWith('/api/core/users/user-123/follow', {
        method: 'POST',
      });
    });

    it('calls DELETE /api/core/users/:userId/follow', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(undefined);
      await socialApi.unfollow('user-123');
      expect(spy).toHaveBeenCalledWith('/api/core/users/user-123/follow', {
        method: 'DELETE',
      });
    });

    it('gets followers with pagination params', async () => {
      const mockFollowers = [
        {
          userId: 'u1',
          username: 'user1',
          name: 'User One',
          avatarUrl: null,
          isFollowingViewer: true,
        },
      ];
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockFollowers);
      const res = await socialApi.getFollowers('user-123', { limit: 15, before: '2026-01-01T00:00:00.000Z' });
      expect(spy).toHaveBeenCalledWith(
        '/api/core/users/user-123/followers?limit=15&before=2026-01-01T00%3A00%3A00.000Z'
      );
      expect(res).toEqual(mockFollowers);
    });

    it('gets following with pagination params', async () => {
      const mockFollowing = [
        {
          userId: 'u2',
          username: 'user2',
          name: 'User Two',
          avatarUrl: null,
          isFollowingViewer: false,
        },
      ];
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockFollowing);
      const res = await socialApi.getFollowing('user-123', { limit: 20 });
      expect(spy).toHaveBeenCalledWith('/api/core/users/user-123/following?limit=20');
      expect(res).toEqual(mockFollowing);
    });

    it('gets suggestions with default or custom limit', async () => {
      const mockSuggestions = [
        {
          userId: 'u3',
          username: 'user3',
          name: 'User Three',
          avatarUrl: null,
          followerCount: 42,
        },
      ];
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockSuggestions);
      const res = await socialApi.getSuggestions(5);
      expect(spy).toHaveBeenCalledWith('/api/core/users/me/suggestions?limit=5');
      expect(res).toEqual(mockSuggestions);
    });
  });

  describe('Posts & Likes', () => {
    it('creates post with JSON payload', async () => {
      const mockPost = {
        id: 'post-1',
        body: 'Hello Nebron!',
        likeCount: 0,
        commentCount: 0,
        likedByViewer: false,
        createdAt: '2026-11-25T00:00:00.000Z',
        author: {
          userId: 'u1',
          username: 'user1',
          name: 'User One',
          avatarUrl: null,
        },
      };
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockPost);
      const res = await socialApi.createPost('Hello Nebron!');
      expect(spy).toHaveBeenCalledWith('/api/core/posts', {
        method: 'POST',
        body: JSON.stringify({ body: 'Hello Nebron!' }),
      });
      expect(res).toEqual(mockPost);
    });

    it('retrieves user posts with limit and before', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce([]);
      await socialApi.getUserPosts('u1', { limit: 10, before: '2026-11-20T00:00:00.000Z' });
      expect(spy).toHaveBeenCalledWith(
        '/api/core/users/u1/posts?limit=10&before=2026-11-20T00%3A00%3A00.000Z'
      );
    });

    it('fetches single post detail', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({ id: 'p1' });
      const res = await socialApi.getPost('p1');
      expect(spy).toHaveBeenCalledWith('/api/core/posts/p1');
      expect(res).toEqual({ id: 'p1' });
    });

    it('deletes post by id', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(undefined);
      await socialApi.deletePost('p1');
      expect(spy).toHaveBeenCalledWith('/api/core/posts/p1', {
        method: 'DELETE',
      });
    });

    it('likes post via POST and unlikes via DELETE', async () => {
      const spyLike = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(undefined);
      await socialApi.likePost('p1');
      expect(spyLike).toHaveBeenCalledWith('/api/core/posts/p1/like', {
        method: 'POST',
      });

      const spyUnlike = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(undefined);
      await socialApi.unlikePost('p1');
      expect(spyUnlike).toHaveBeenCalledWith('/api/core/posts/p1/like', {
        method: 'DELETE',
      });
    });

    it('fetches post likes list', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce([]);
      await socialApi.getPostLikes('p1', { limit: 30 });
      expect(spy).toHaveBeenCalledWith('/api/core/posts/p1/likes?limit=30');
    });

    it('fetches feed with pagination params', async () => {
      const mockFeed = { data: [], hasMore: false };
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockFeed);
      const res = await socialApi.getFeed({ limit: 15, before: '2026-11-25T12:00:00.000Z' });
      expect(spy).toHaveBeenCalledWith(
        '/api/core/feed?limit=15&before=2026-11-25T12%3A00%3A00.000Z'
      );
      expect(res).toEqual(mockFeed);
    });

    it('creates post with imageKey', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({ id: 'p2' });
      await socialApi.createPost({ body: 'Post with image', imageKey: 'posts/u1/abc.png' });
      expect(spy).toHaveBeenCalledWith('/api/core/posts', {
        method: 'POST',
        body: JSON.stringify({ body: 'Post with image', imageKey: 'posts/u1/abc.png' }),
      });
    });

    it('requests presigned image upload slot', async () => {
      const mockSlot = {
        uploadUrl: 'http://minio:9000/posts/u1/abc.png',
        objectKey: 'posts/u1/abc.png',
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        expiresInSeconds: 300,
      };
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockSlot);
      const res = await socialApi.getPostImageUploadUrl('image/png', 1024);
      expect(spy).toHaveBeenCalledWith('/api/core/posts/image/upload-url', {
        method: 'POST',
        body: JSON.stringify({ contentType: 'image/png', contentLength: 1024 }),
      });
      expect(res).toEqual(mockSlot);
    });

    it('confirms uploaded post image', async () => {
      const mockConfirm = { verified: true, objectKey: 'posts/u1/abc.png', url: 'https://r2.nebron.app/posts/u1/abc.png' };
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockConfirm);
      const res = await socialApi.confirmPostImage('posts/u1/abc.png');
      expect(spy).toHaveBeenCalledWith('/api/core/posts/image/confirm', {
        method: 'POST',
        body: JSON.stringify({ objectKey: 'posts/u1/abc.png' }),
      });
      expect(res).toEqual(mockConfirm);
    });

    it('uploads post image via multipart POST FormData when slot returns presigned fields', async () => {
      const mockSlot = {
        uploadUrl: 'https://example.trycloudflare.com/nebron-media',
        objectKey: 'posts/u1/abc.png',
        fields: {
          key: 'posts/u1/abc.png',
          'Content-Type': 'image/png',
          Policy: 'abc',
          'X-Amz-Signature': 'sig',
        },
        expiresAt: '2026-11-27T12:00:00Z',
        maxBytes: 10485760,
      };
      const mockConfirm = { verified: true, objectKey: 'posts/u1/abc.png', url: 'https://example.trycloudflare.com/nebron-media/posts/u1/abc.png' };
      const apiSpy = vi
        .spyOn(apiModule, 'apiFetch')
        .mockResolvedValueOnce(mockSlot)
        .mockResolvedValueOnce(mockConfirm);

      const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, status: 204 });
      vi.stubGlobal('fetch', fetchMock);

      const file = new File([new Uint8Array([137, 80, 78, 71])], 'test.png', { type: 'image/png' });
      const res = await socialApi.uploadPostImageFile(file);

      expect(apiSpy).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://example.trycloudflare.com/nebron-media');
      expect(init.method).toBe('POST');
      expect(init.body).toBeInstanceOf(FormData);
      expect((init.body as FormData).get('key')).toBe('posts/u1/abc.png');
      expect((init.body as FormData).get('Policy')).toBe('abc');
      expect((init.body as FormData).get('file')).toBeInstanceOf(File);
      expect(res).toEqual({
        objectKey: 'posts/u1/abc.png',
        url: 'https://example.trycloudflare.com/nebron-media/posts/u1/abc.png',
      });

      vi.unstubAllGlobals();
    });

    it('deletes post image via DELETE /posts/image/*', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(undefined);
      await socialApi.deletePostImage('posts/u1/abc.png');
      expect(spy).toHaveBeenCalledWith(
        `/api/core/posts/image/${encodeURIComponent('posts/u1/abc.png')}`,
        { method: 'DELETE' }
      );
    });
  });

  describe('Comments', () => {
    it('fetches comments with pagination params', async () => {
      const mockComments = [
        {
          id: 'c1',
          postId: 'p1',
          body: 'Great post!',
          createdAt: '2026-11-25T14:00:00.000Z',
          author: { userId: 'u2', username: 'bob', name: 'Bob', avatarUrl: null },
        },
      ];
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockComments);
      const res = await socialApi.getComments('p1', { limit: 10, before: '2026-11-25T15:00:00.000Z' });
      expect(spy).toHaveBeenCalledWith(
        '/api/core/posts/p1/comments?limit=10&before=2026-11-25T15%3A00%3A00.000Z'
      );
      expect(res).toEqual(mockComments);
    });

    it('creates comment with POST /posts/:id/comments', async () => {
      const mockComment = {
        id: 'c2',
        postId: 'p1',
        body: 'Awesome!',
        createdAt: '2026-11-25T14:05:00.000Z',
        author: { userId: 'u1', username: 'alice', name: 'Alice', avatarUrl: null },
      };
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockComment);
      const res = await socialApi.createComment('p1', 'Awesome!');
      expect(spy).toHaveBeenCalledWith('/api/core/posts/p1/comments', {
        method: 'POST',
        body: JSON.stringify({ body: 'Awesome!' }),
      });
      expect(res).toEqual(mockComment);
    });

    it('deletes comment with DELETE /comments/:id', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(undefined);
      await socialApi.deleteComment('c2');
      expect(spy).toHaveBeenCalledWith('/api/core/comments/c2', {
        method: 'DELETE',
      });
    });

    it('creates threaded reply, lists sorted comments, loads replies, and likes/unlikes comments', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValue([]);

      await socialApi.getComments('p1', { limit: 20, sort: 'top' });
      expect(spy).toHaveBeenCalledWith('/api/core/posts/p1/comments?limit=20&sort=top');

      await socialApi.createComment('p1', 'Nested reply', 'c1');
      expect(spy).toHaveBeenCalledWith('/api/core/posts/p1/comments', {
        method: 'POST',
        body: JSON.stringify({ body: 'Nested reply', parentCommentId: 'c1' }),
      });

      await socialApi.getCommentReplies('c1', { limit: 20 });
      expect(spy).toHaveBeenCalledWith('/api/core/comments/c1/replies?limit=20');

      await socialApi.likeComment('c1');
      expect(spy).toHaveBeenCalledWith('/api/core/comments/c1/like', { method: 'POST' });

      await socialApi.unlikeComment('c1');
      expect(spy).toHaveBeenCalledWith('/api/core/comments/c1/like', { method: 'DELETE' });
    });

    it('edits post via PATCH /posts/:id', async () => {
      const mockPost = { id: 'p1', body: 'New text' };
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockPost);
      const res = await socialApi.editPost('p1', { body: 'New text', removeImage: true });
      expect(spy).toHaveBeenCalledWith('/api/core/posts/p1', {
        method: 'PATCH',
        body: JSON.stringify({ body: 'New text', removeImage: true }),
      });
      expect(res).toEqual(mockPost);
    });

    it('fetches popular posts', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce([]);
      await socialApi.getPopularPosts(15);
      expect(spy).toHaveBeenCalledWith('/api/core/posts/popular?limit=15');
    });

    it('fetches viewer liked posts', async () => {
      const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce([]);
      await socialApi.getMyLikedPosts({ limit: 10, before: '2026-11-25T12:00:00.000Z' });
      expect(spy).toHaveBeenCalledWith(
        '/api/core/users/me/likes?limit=10&before=2026-11-25T12%3A00%3A00.000Z'
      );
    });
  });
});
