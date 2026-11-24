import { apiFetch } from '@/lib/api';
import type {
  Conversation,
  ChatMessage,
  ConversationMember,
  PublicUser,
  UserRelationship,
  BlockedUser,
} from './chat-types';

export interface ListConversationsParams {
  kind?: 'direct' | 'group' | 'all';
  before?: string;
  limit?: number;
}

export interface ListMessagesParams {
  before?: string;
  limit?: number;
}

export const chatApi = {
  async listConversations(params: ListConversationsParams = {}): Promise<Conversation[]> {
    const query = new URLSearchParams();
    if (params.kind) query.set('kind', params.kind);
    if (params.before) query.set('before', params.before);
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const url = `/api/chat/conversations${qs ? `?${qs}` : ''}`;
    const res = await apiFetch<{ data: Conversation[] }>(url);
    return res.data || [];
  },

  async listMessages(
    conversationId: string,
    params: ListMessagesParams = {}
  ): Promise<{ data: ChatMessage[]; hasMore: boolean }> {
    const query = new URLSearchParams();
    if (params.before) query.set('before', params.before);
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const url = `/api/chat/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`;
    return apiFetch<{ data: ChatMessage[]; hasMore: boolean }>(url);
  },

  async createDirect(peerUserId: string): Promise<{
    conversationId: string;
    requestState?: 'active' | 'pending' | 'rejected' | null;
    request_state?: 'active' | 'pending' | 'rejected' | null;
  }> {
    return apiFetch<{
      conversationId: string;
      requestState?: 'active' | 'pending' | 'rejected' | null;
      request_state?: 'active' | 'pending' | 'rejected' | null;
    }>('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ peerUserId }),
    });
  },

  async listRequests(): Promise<Conversation[]> {
    const res = await apiFetch<{ data: Conversation[] }>('/api/chat/conversations/requests');
    return res.data || [];
  },

  async acceptRequest(conversationId: string): Promise<Conversation> {
    return apiFetch<Conversation>(`/api/chat/conversations/${conversationId}/accept-request`, {
      method: 'POST',
    });
  },

  async rejectRequest(conversationId: string): Promise<void> {
    await apiFetch<void>(`/api/chat/conversations/${conversationId}/reject-request`, {
      method: 'POST',
    });
  },

  async createGroup(name: string, memberIds: string[]): Promise<{ conversationId: string }> {
    return apiFetch<{ conversationId: string }>('/api/chat/conversations/group', {
      method: 'POST',
      body: JSON.stringify({ name, memberIds }),
    });
  },

  async addMembers(conversationId: string, userIds: string[]): Promise<void> {
    await apiFetch(`/api/chat/conversations/${conversationId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    });
  },

  async removeMember(conversationId: string, userId: string): Promise<void> {
    await apiFetch(`/api/chat/conversations/${conversationId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  async renameGroup(conversationId: string, name: string): Promise<void> {
    await apiFetch(`/api/chat/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  },

  async listMembers(
    conversationId: string,
    params: { before?: string; limit?: number } = {}
  ): Promise<{ data: ConversationMember[]; hasMore: boolean }> {
    const query = new URLSearchParams();
    if (params.before) query.set('before', params.before);
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const url = `/api/chat/conversations/${conversationId}/members${qs ? `?${qs}` : ''}`;
    return apiFetch<{ data: ConversationMember[]; hasMore: boolean }>(url);
  },

  async sendMessageHttp(
    conversationId: string,
    body: string,
    clientId?: string
  ): Promise<{ message: ChatMessage }> {
    return apiFetch<{ message: ChatMessage }>(
      `/api/chat/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ body, clientId }),
      }
    );
  },

  async markReadHttp(conversationId: string, messageId?: string): Promise<void> {
    await apiFetch(`/api/chat/conversations/${conversationId}/read`, {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    });
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await apiFetch(`/api/chat/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },

  // Users & Profiles Discovery
  async searchUsers(q: string, limit = 20): Promise<PublicUser[]> {
    if (!q || !q.trim()) return [];
    const url = `/api/core/users/search?q=${encodeURIComponent(q.trim())}&limit=${limit}`;
    const res = await apiFetch<{ users: PublicUser[] }>(url);
    return res.users || [];
  },

  async getUserByUsername(username: string): Promise<PublicUser> {
    return apiFetch<PublicUser>(`/api/core/users/by-username/${encodeURIComponent(username)}`);
  },

  async getUserById(userId: string): Promise<PublicUser> {
    return apiFetch<PublicUser>(`/api/core/users/${encodeURIComponent(userId)}`);
  },

  // Relationships: Block / Mute
  async getRelationship(userId: string): Promise<UserRelationship> {
    return apiFetch<UserRelationship>(`/api/core/relationships/${userId}`);
  },

  async getBlockedUsers(): Promise<{ blocked: BlockedUser[] }> {
    return apiFetch<{ blocked: BlockedUser[] }>('/api/core/relationships/blocked');
  },

  async blockUser(userId: string): Promise<void> {
    await apiFetch(`/api/core/relationships/${userId}/block`, {
      method: 'POST',
    });
  },

  async unblockUser(userId: string): Promise<void> {
    await apiFetch(`/api/core/relationships/${userId}/block`, {
      method: 'DELETE',
    });
  },

  async muteUser(
    userId: string,
    options: { calls?: boolean; messages?: boolean; until?: string | null } = {
      calls: true,
      messages: true,
    }
  ): Promise<void> {
    await apiFetch(`/api/core/relationships/${userId}/mute`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  async unmuteUser(userId: string): Promise<void> {
    await apiFetch(`/api/core/relationships/${userId}/mute`, {
      method: 'DELETE',
      body: JSON.stringify({ calls: true, messages: true }),
    });
  },
};
