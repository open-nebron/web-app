import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storiesApi } from './stories-api';
import * as apiModule from './api';

describe('Stories API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getUploadUrl calls POST /api/core/stories/upload-url', async () => {
    const slot = {
      uploadUrl: 'http://localhost:9000/nebron-media',
      fields: { key: 'stories/u1/abc.jpg' },
      objectKey: 'stories/u1/abc.jpg',
      expiresAt: '2026-11-26T12:00:00Z',
      maxBytes: 10485760,
    };
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(slot);

    const res = await storiesApi.getUploadUrl('image/jpeg', 12345);
    expect(spy).toHaveBeenCalledWith('/api/core/stories/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType: 'image/jpeg', contentLength: 12345 }),
    });
    expect(res).toEqual(slot);
  });

  it('confirmStory calls POST /api/core/stories/confirm', async () => {
    const story = {
      id: 'st-1',
      authorId: 'u1',
      mediaUrl: 'http://localhost:9000/nebron-media/stories/u1/abc.jpg',
      mediaType: 'image' as const,
      duration: 5,
      caption: 'Hello!',
      viewedByMe: false,
      viewerCount: 0,
      createdAt: '2026-11-26T10:00:00Z',
      expiresAt: '2026-11-27T10:00:00Z',
    };
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(story);

    const res = await storiesApi.confirmStory({
      objectKey: 'stories/u1/abc.jpg',
      mediaType: 'image',
      duration: 5,
      caption: 'Hello!',
    });

    expect(spy).toHaveBeenCalledWith('/api/core/stories/confirm', {
      method: 'POST',
      body: JSON.stringify({
        objectKey: 'stories/u1/abc.jpg',
        mediaType: 'image',
        duration: 5,
        caption: 'Hello!',
      }),
    });
    expect(res).toEqual(story);
  });

  it('getStories calls GET /api/core/stories', async () => {
    const mockResp = { groups: [] };
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockResp);

    const res = await storiesApi.getStories();
    expect(spy).toHaveBeenCalledWith('/api/core/stories');
    expect(res).toEqual(mockResp);
  });

  it('getUserStories calls GET /api/core/stories/:userId', async () => {
    const mockGroup = {
      userId: 'u2',
      username: 'bob',
      name: 'Bob',
      avatarUrl: null,
      isMine: false,
      stories: [],
      hasUnviewed: false,
    };
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockGroup);

    const res = await storiesApi.getUserStories('u2');
    expect(spy).toHaveBeenCalledWith('/api/core/stories/u2');
    expect(res).toEqual(mockGroup);
  });

  it('viewStory calls POST /api/core/stories/:id/view', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(undefined);

    await storiesApi.viewStory('st-1');
    expect(spy).toHaveBeenCalledWith('/api/core/stories/st-1/view', {
      method: 'POST',
    });
  });

  it('deleteStory calls DELETE /api/core/stories/:id', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(undefined);

    await storiesApi.deleteStory('st-1');
    expect(spy).toHaveBeenCalledWith('/api/core/stories/st-1', {
      method: 'DELETE',
    });
  });

  it('getStoryViewers calls GET /api/core/stories/:id/viewers', async () => {
    const mockViewers = {
      viewerCount: 1,
      viewers: [
        {
          userId: 'u2',
          username: 'bob',
          name: 'Bob',
          avatarUrl: null,
          viewedAt: '2026-11-26T10:10:00Z',
        },
      ],
    };
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockViewers);

    const res = await storiesApi.getStoryViewers('st-1');
    expect(spy).toHaveBeenCalledWith('/api/core/stories/st-1/viewers');
    expect(res).toEqual(mockViewers);
  });

  it('uploadStoryFile posts multipart FormData to presigned uploadUrl', async () => {
    const slot = {
      uploadUrl: 'http://localhost:9000/nebron-media',
      fields: { key: 'stories/u1/abc.jpg', Policy: 'xyz' },
      objectKey: 'stories/u1/abc.jpg',
      expiresAt: '2026-11-26T12:00:00Z',
      maxBytes: 10485760,
    };
    vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(slot);

    const fetchSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const file = new File(['hello'], 'photo.jpg', { type: 'image/jpeg' });
    const res = await storiesApi.uploadStoryFile(file);

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:9000/nebron-media',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
    expect(res.objectKey).toBe('stories/u1/abc.jpg');
  });
});
