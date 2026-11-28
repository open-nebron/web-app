import { apiFetch } from './api';
import { normalizeStorageUrl } from './utils';
import type {
  Comment,
  CommentReactionSummary,
  FollowSourceType,
  HashtagPostsResponse,
  Post,
  PostImageConfirmResponse,
  PostImageUploadUrlResponse,
  ShareContentResponse,
  ShareContentType,
  TrendingHashtag,
  UserFollowItem,
  UserSuggestionItem,
} from './types';

export const socialApi = {
  async follow(userId: string, source?: FollowSourceType): Promise<void> {
    return apiFetch<void>(`/api/core/users/${userId}/follow`, {
      method: 'POST',
      headers: source ? { 'X-Follow-Source': source } : undefined,
    });
  },

  async unfollow(userId: string): Promise<void> {
    return apiFetch<void>(`/api/core/users/${userId}/follow`, {
      method: 'DELETE',
    });
  },

  async getFollowers(
    userId: string,
    params: { limit?: number; before?: string } = {}
  ): Promise<UserFollowItem[]> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<UserFollowItem[]>(`/api/core/users/${userId}/followers${query}`);
  },

  async getFollowing(
    userId: string,
    params: { limit?: number; before?: string } = {}
  ): Promise<UserFollowItem[]> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<UserFollowItem[]>(`/api/core/users/${userId}/following${query}`);
  },

  async getSuggestions(limit: number = 10): Promise<UserSuggestionItem[]> {
    return apiFetch<UserSuggestionItem[]>(`/api/core/users/me/suggestions?limit=${limit}`);
  },

  async createPost(
    bodyOrPayload: string | { body: string; imageKey?: string | null },
    imageKey?: string | null
  ): Promise<Post> {
    const payload =
      typeof bodyOrPayload === 'string'
        ? { body: bodyOrPayload, ...(imageKey ? { imageKey } : {}) }
        : bodyOrPayload;
    return apiFetch<Post>('/api/core/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPostImageUploadUrl(
    contentType: string,
    contentLength: number
  ): Promise<PostImageUploadUrlResponse> {
    return apiFetch<PostImageUploadUrlResponse>('/api/core/posts/image/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentLength }),
    });
  },

  async confirmPostImage(objectKey: string): Promise<PostImageConfirmResponse> {
    return apiFetch<PostImageConfirmResponse>('/api/core/posts/image/confirm', {
      method: 'POST',
      body: JSON.stringify({ objectKey }),
    });
  },

  async deletePostImage(objectKey: string): Promise<void> {
    return apiFetch<void>(`/api/core/posts/image/${encodeURIComponent(objectKey)}`, {
      method: 'DELETE',
    });
  },

  async uploadPostImageFile(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<{ objectKey: string; url: string }> {
    const slot = await this.getPostImageUploadUrl(file.type, file.size);
    const uploadUrl = normalizeStorageUrl(slot.uploadUrl);
    const isPresignedPost = Boolean(slot.fields);

    let payload: FormData | File = file;
    let method = slot.method || 'PUT';
    const headers: Record<string, string> = {};

    if (isPresignedPost && slot.fields) {
      method = 'POST';
      const formData = new FormData();
      Object.entries(slot.fields).forEach(([k, v]) => {
        formData.append(k, v);
      });
      formData.append('file', file);
      payload = formData;
    } else {
      headers['Content-Type'] = file.type;
      if (slot.headers) {
        Object.entries(slot.headers).forEach(([k, v]) => {
          if (k.toLowerCase() !== 'content-type') {
            headers[k] = v;
          }
        });
      }
    }

    if (onProgress && typeof XMLHttpRequest !== 'undefined') {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, uploadUrl);
        Object.entries(headers).forEach(([k, v]) => {
          xhr.setRequestHeader(k, v);
        });
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Storage upload network error'));
        xhr.send(payload);
      });
    } else {
      const res = await fetch(uploadUrl, {
        method,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
        body: payload,
      });
      if (!res.ok) {
        throw new Error(`Storage upload failed with status ${res.status}`);
      }
    }

    const confirmRes = await this.confirmPostImage(slot.objectKey);
    return { objectKey: slot.objectKey, url: confirmRes.url };
  },

  async getComments(
    postId: string,
    params: { limit?: number; before?: string; sort?: 'top' | 'new' } = {}
  ): Promise<Comment[]> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    if (params.sort) sp.set('sort', params.sort);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<Comment[]>(`/api/core/posts/${postId}/comments${query}`);
  },

  async createComment(
    postId: string,
    body: string,
    parentCommentId?: string | null
  ): Promise<Comment> {
    const payload =
      parentCommentId !== undefined && parentCommentId !== null
        ? { body, parentCommentId }
        : { body };
    return apiFetch<Comment>(`/api/core/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getCommentReplies(
    commentId: string,
    params: { limit?: number; before?: string } = {}
  ): Promise<Comment[]> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<Comment[]>(
      `/api/core/comments/${encodeURIComponent(commentId)}/replies${query}`
    );
  },

  async likeComment(commentId: string): Promise<void> {
    return apiFetch<void>(`/api/core/comments/${encodeURIComponent(commentId)}/like`, {
      method: 'POST',
    });
  },

  async unlikeComment(commentId: string): Promise<void> {
    return apiFetch<void>(`/api/core/comments/${encodeURIComponent(commentId)}/like`, {
      method: 'DELETE',
    });
  },

  async deleteComment(commentId: string): Promise<void> {
    return apiFetch<void>(`/api/core/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  async editComment(commentId: string, body: string): Promise<Comment> {
    return apiFetch<Comment>(`/api/core/comments/${encodeURIComponent(commentId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });
  },

  async pinComment(postId: string, commentId: string): Promise<void> {
    return apiFetch<void>(
      `/api/core/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/pin`,
      { method: 'POST' }
    );
  },

  async unpinComment(postId: string, commentId: string): Promise<void> {
    return apiFetch<void>(
      `/api/core/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/pin`,
      { method: 'DELETE' }
    );
  },

  async searchUsers(q: string, limit: number = 8): Promise<UserFollowItem[]> {
    const trimmed = q.trim();
    if (!trimmed) return [];
    const res = await apiFetch<{ users?: UserFollowItem[] } | UserFollowItem[]>(
      `/api/core/users/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`
    );
    return Array.isArray(res) ? res : res?.users || [];
  },

  async getHashtagPosts(
    tag: string,
    params: { limit?: number; before?: string } = {}
  ): Promise<HashtagPostsResponse> {
    const normalized = tag.replace(/^#/, '').trim().toLowerCase();
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<HashtagPostsResponse>(
      `/api/core/hashtags/${encodeURIComponent(normalized)}/posts${query}`
    );
  },

  async getTrendingHashtags(limit: number = 10): Promise<TrendingHashtag[]> {
    return apiFetch<TrendingHashtag[]>(`/api/core/hashtags/trending?limit=${limit}`);
  },

  async getUserPosts(
    userId: string,
    params: { limit?: number; before?: string } = {}
  ): Promise<Post[]> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<Post[]>(`/api/core/users/${userId}/posts${query}`);
  },

  async getPost(id: string): Promise<Post> {
    return apiFetch<Post>(`/api/core/posts/${id}`);
  },

  async deletePost(id: string): Promise<void> {
    return apiFetch<void>(`/api/core/posts/${id}`, {
      method: 'DELETE',
    });
  },

  async likePost(id: string): Promise<void> {
    return apiFetch<void>(`/api/core/posts/${id}/like`, {
      method: 'POST',
    });
  },

  async unlikePost(id: string): Promise<void> {
    return apiFetch<void>(`/api/core/posts/${id}/like`, {
      method: 'DELETE',
    });
  },

  async getPostLikes(
    id: string,
    params: { limit?: number; before?: string } = {}
  ): Promise<UserFollowItem[]> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<UserFollowItem[]>(`/api/core/posts/${id}/likes${query}`);
  },

  async getFeed(
    params: { limit?: number; before?: string } = {}
  ): Promise<{ data: Post[]; hasMore: boolean }> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<{ data: Post[]; hasMore: boolean }>(`/api/core/feed${query}`);
  },

  async editPost(
    id: string,
    update: { body?: string; removeImage?: boolean }
  ): Promise<Post> {
    return apiFetch<Post>(`/api/core/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  },

  async getPopularPosts(limit: number = 20): Promise<Post[]> {
    return apiFetch<Post[]>(`/api/core/posts/popular?limit=${limit}`);
  },

  async getMyLikedPosts(
    params: { limit?: number; before?: string } = {}
  ): Promise<Post[]> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<Post[]>(`/api/core/users/me/likes${query}`);
  },

  async savePost(id: string): Promise<void> {
    return apiFetch<void>(`/api/core/posts/${encodeURIComponent(id)}/save`, {
      method: 'POST',
    });
  },

  async unsavePost(id: string): Promise<void> {
    return apiFetch<void>(`/api/core/posts/${encodeURIComponent(id)}/save`, {
      method: 'DELETE',
    });
  },

  async getSavedPosts(
    params: { limit?: number; before?: string } = {}
  ): Promise<Post[]> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<Post[]>(`/api/core/users/me/saved/posts${query}`);
  },

  async saveComment(id: string): Promise<void> {
    return apiFetch<void>(`/api/core/comments/${encodeURIComponent(id)}/save`, {
      method: 'POST',
    });
  },

  async unsaveComment(id: string): Promise<void> {
    return apiFetch<void>(`/api/core/comments/${encodeURIComponent(id)}/save`, {
      method: 'DELETE',
    });
  },

  async getSavedComments(
    params: { limit?: number; before?: string } = {}
  ): Promise<Comment[]> {
    const sp = new URLSearchParams();
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);
    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<Comment[]>(`/api/core/users/me/saved/comments${query}`);
  },

  async shareContent(
    contentType: ShareContentType,
    contentId: string
  ): Promise<ShareContentResponse> {
    return apiFetch<ShareContentResponse>('/api/core/share', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentId }),
    });
  },

  async addCommentReaction(
    commentId: string,
    emoji: string
  ): Promise<{ reactions: CommentReactionSummary[] }> {
    return apiFetch<{ reactions: CommentReactionSummary[] }>(
      `/api/core/comments/${encodeURIComponent(commentId)}/reactions/${encodeURIComponent(emoji)}`,
      { method: 'PUT' }
    );
  },

  async removeCommentReaction(
    commentId: string,
    emoji: string
  ): Promise<{ reactions: CommentReactionSummary[] }> {
    return apiFetch<{ reactions: CommentReactionSummary[] }>(
      `/api/core/comments/${encodeURIComponent(commentId)}/reactions/${encodeURIComponent(emoji)}`,
      { method: 'DELETE' }
    );
  },

  async getCommentReactions(
    commentId: string
  ): Promise<{ reactions: CommentReactionSummary[] }> {
    return apiFetch<{ reactions: CommentReactionSummary[] }>(
      `/api/core/comments/${encodeURIComponent(commentId)}/reactions`
    );
  },
};
