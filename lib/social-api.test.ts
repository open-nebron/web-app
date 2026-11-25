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
  });
});
