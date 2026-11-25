import { apiFetch } from './api';

export interface CreateReportRequest {
  targetType: 'user' | 'post' | 'comment' | 'message';
  targetId: string;
  reason:
    | 'spam'
    | 'harassment'
    | 'hate'
    | 'sexual'
    | 'violence'
    | 'self_harm'
    | 'impersonation'
    | 'other';
  details?: string;
}

export interface AdminStatsResponse {
  users: {
    total: number;
    activeToday: number;
    banned: number;
  };
  posts: {
    total: number;
    today: number;
  };
  reports: {
    pending: number;
    resolvedToday: number;
  };
  messages: {
    today: number;
  };
  calls: {
    today: number;
  };
}

export interface AdminReportItem {
  id: string;
  reporterId: string;
  targetType: 'user' | 'post' | 'comment' | 'message';
  targetId: string;
  targetOwnerId: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  reporter: {
    userId: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
  targetOwner: {
    userId: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
  target: any;
}

export interface AdminReportsListResponse {
  reports: AdminReportItem[];
  nextCursor: string | null;
}

export interface AdminUserItem {
  userId: string;
  username: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  bannedAt: string | null;
  bannedReason: string | null;
  createdAt: string;
  reportCount: number;
}

export interface AdminUsersListResponse {
  users: AdminUserItem[];
  nextCursor: string | null;
}

export interface AdminUserDetailResponse {
  profile: {
    userId: string;
    username: string;
    name: string | null;
    email: string;
    bio: string | null;
    about: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
    isAdmin: boolean;
    isBanned: boolean;
    bannedAt: string | null;
    bannedReason: string | null;
    followerCount: number;
    followingCount: number;
    postCount: number;
    createdAt: string;
  };
  reports: Array<{
    id: string;
    reporterId: string;
    targetType: string;
    targetId: string;
    reason: string;
    details?: string;
    status: string;
    createdAt: string;
  }>;
  actions: Array<{
    id: string;
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, any>;
    createdAt: string;
  }>;
  recentPosts: Array<{
    id: string;
    body: string;
    imageUrl?: string | null;
    likeCount: number;
    commentCount: number;
    createdAt: string;
  }>;
}

export const adminApi = {
  async createReport(data: CreateReportRequest): Promise<{ reportId: string; status: string }> {
    return apiFetch<{ reportId: string; status: string }>('/api/core/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getStats(): Promise<AdminStatsResponse> {
    return apiFetch<AdminStatsResponse>('/api/core/admin/stats');
  },

  async getReports(params: {
    status?: string;
    targetType?: string;
    limit?: number;
    before?: string;
  } = {}): Promise<AdminReportsListResponse> {
    const sp = new URLSearchParams();
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.targetType && params.targetType !== 'all') sp.set('targetType', params.targetType);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);

    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<AdminReportsListResponse>(`/api/core/admin/reports${query}`);
  },

  async getReportById(id: string): Promise<{ report: AdminReportItem }> {
    return apiFetch<{ report: AdminReportItem }>(`/api/core/admin/reports/${id}`);
  },

  async resolveReport(
    id: string,
    action: string,
    note?: string
  ): Promise<{ report: AdminReportItem }> {
    return apiFetch<{ report: AdminReportItem }>(`/api/core/admin/reports/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    });
  },

  async getUsers(params: {
    q?: string;
    limit?: number;
    before?: string;
  } = {}): Promise<AdminUsersListResponse> {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.before) sp.set('before', params.before);

    const query = sp.toString() ? `?${sp.toString()}` : '';
    return apiFetch<AdminUsersListResponse>(`/api/core/admin/users${query}`);
  },

  async getUserDetail(userId: string): Promise<AdminUserDetailResponse> {
    return apiFetch<AdminUserDetailResponse>(`/api/core/admin/users/${userId}`);
  },

  async banUser(userId: string, reason: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/api/core/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async unbanUser(userId: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/api/core/admin/users/${userId}/unban`, {
      method: 'POST',
    });
  },

  async promoteUser(userId: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/api/core/admin/users/${userId}/promote`, {
      method: 'POST',
    });
  },

  async demoteUser(userId: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/api/core/admin/users/${userId}/demote`, {
      method: 'POST',
    });
  },

  async deletePost(postId: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/api/core/admin/posts/${postId}`, {
      method: 'DELETE',
    });
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(
      `/api/core/admin/messages/${conversationId}/${messageId}`,
      {
        method: 'DELETE',
      }
    );
  },
};
