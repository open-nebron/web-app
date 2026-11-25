import { apiFetch } from './api';
import type { Post, UserFollowItem, UserSuggestionItem } from './types';

export const socialApi = {
  async follow(userId: string): Promise<void> {
    return apiFetch<void>(`/api/core/users/${userId}/follow`, {
      method: 'POST',
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

  async createPost(body: string): Promise<Post> {
    return apiFetch<Post>('/api/core/posts', {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
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
};
