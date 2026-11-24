import { apiFetch } from './api';
import type {
  CallRecord,
  StartCallResponse,
  StartGroupCallResponse,
  JoinGroupCallResponse,
  AcceptCallResponse,
  RefreshTokenResponse,
} from './call-types';

export const voiceApi = {
  async startCall(calleeId: string, mode: 'audio' | 'video' = 'audio'): Promise<StartCallResponse> {
    return apiFetch<StartCallResponse>('/api/voice/calls', {
      method: 'POST',
      body: JSON.stringify({ calleeId, mode }),
    });
  },

  async startGroupCall(
    conversationId: string,
    firstInviteeId?: string,
    mode: 'audio' | 'video' = 'audio'
  ): Promise<StartGroupCallResponse> {
    return apiFetch<StartGroupCallResponse>(`/api/voice/conversations/${conversationId}/calls`, {
      method: 'POST',
      body: JSON.stringify({ firstInviteeId, mode }),
    });
  },

  async joinGroupCall(callId: string): Promise<JoinGroupCallResponse> {
    return apiFetch<JoinGroupCallResponse>(`/api/voice/calls/${callId}/join`, {
      method: 'POST',
    });
  },

  async leaveGroupCall(callId: string): Promise<{ ok: boolean; remainingCount: number }> {
    return apiFetch<{ ok: boolean; remainingCount: number }>(`/api/voice/calls/${callId}/leave`, {
      method: 'POST',
    });
  },

  async endGroupCall(callId: string): Promise<{ call: CallRecord }> {
    const res = await apiFetch<any>(`/api/voice/calls/${callId}`, {
      method: 'DELETE',
    });
    return res?.call ? res : { call: res };
  },

  async getConversationCall(
    conversationId: string,
    state?: string
  ): Promise<{ call: CallRecord } | null> {
    const query = new URLSearchParams();
    query.set('conversationId', conversationId);
    if (state) query.set('state', state);
    const res = await apiFetch<any>(`/api/voice/calls?${query.toString()}`);
    if (!res) return null;
    if (res.call) return res;
    if (res.id) return { call: res };
    return null;
  },

  async acceptCall(callId: string): Promise<AcceptCallResponse> {
    return apiFetch<AcceptCallResponse>(`/api/voice/calls/${callId}/accept`, {
      method: 'POST',
    });
  },

  async rejectCall(callId: string, reason = 'reject'): Promise<{ call: CallRecord }> {
    const res = await apiFetch<any>(`/api/voice/calls/${callId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res?.call ? res : { call: res };
  },

  async endCall(callId: string): Promise<{ call: CallRecord }> {
    const res = await apiFetch<any>(`/api/voice/calls/${callId}/end`, {
      method: 'POST',
    });
    return res?.call ? res : { call: res };
  },

  async getCall(callId: string): Promise<{ call: CallRecord }> {
    const res = await apiFetch<any>(`/api/voice/calls/${callId}`);
    return res?.call ? res : { call: res };
  },

  async getActiveCall(): Promise<{ call: CallRecord } | null> {
    const res = await apiFetch<any>('/api/voice/calls/active');
    if (!res) return null;
    if (res.call) return res;
    return { call: res };
  },

  async getCallHistory(params: {
    before?: string;
    limit?: number;
  } = {}): Promise<{ data: CallRecord[]; hasMore: boolean }> {
    const query = new URLSearchParams();
    if (params.before) query.set('before', params.before);
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const url = `/api/voice/calls${qs ? `?${qs}` : ''}`;
    const res = await apiFetch<{ calls?: CallRecord[]; data?: CallRecord[]; nextCursor?: string }>(url);
    const list = res?.calls || res?.data || [];
    return {
      data: list,
      hasMore: Boolean(res?.nextCursor),
    };
  },

  async refreshTokens(callId: string): Promise<RefreshTokenResponse> {
    return apiFetch<RefreshTokenResponse>(`/api/voice/calls/${callId}/tokens`, {
      method: 'POST',
    });
  },
};
