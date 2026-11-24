import { apiFetch } from './api';
import type {
  CallRecord,
  StartCallResponse,
  AcceptCallResponse,
  RefreshTokenResponse,
} from './call-types';

export const voiceApi = {
  async startCall(calleeId: string): Promise<StartCallResponse> {
    return apiFetch<StartCallResponse>('/api/voice/calls', {
      method: 'POST',
      body: JSON.stringify({ calleeId }),
    });
  },

  async acceptCall(callId: string): Promise<AcceptCallResponse> {
    return apiFetch<AcceptCallResponse>(`/api/voice/calls/${callId}/accept`, {
      method: 'POST',
    });
  },

  async rejectCall(callId: string, reason = 'reject'): Promise<{ call: CallRecord }> {
    return apiFetch<{ call: CallRecord }>(`/api/voice/calls/${callId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async endCall(callId: string): Promise<{ call: CallRecord }> {
    return apiFetch<{ call: CallRecord }>(`/api/voice/calls/${callId}/end`, {
      method: 'POST',
    });
  },

  async getCall(callId: string): Promise<{ call: CallRecord }> {
    return apiFetch<{ call: CallRecord }>(`/api/voice/calls/${callId}`);
  },

  async getActiveCall(): Promise<{ call: CallRecord } | null> {
    return apiFetch<{ call: CallRecord } | null>('/api/voice/calls/active');
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
    return apiFetch<{ data: CallRecord[]; hasMore: boolean }>(url);
  },

  async refreshTokens(callId: string): Promise<RefreshTokenResponse> {
    return apiFetch<RefreshTokenResponse>(`/api/voice/calls/${callId}/tokens`, {
      method: 'POST',
    });
  },
};
