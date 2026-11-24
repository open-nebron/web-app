export type CallMode = 'audio' | 'video';

export interface CallInviteBody {
  callId: string;
  roomName: string;
  hostId: string;
  mode: CallMode;
  startedAt: string;
  endedAt?: string | null;
  endReason?: string | null;
  endedBy?: string | null;
}

export type CallState =
  | { kind: 'idle' }
  | {
      kind: 'incoming';
      callId: string;
      callerId: string;
      roomName: string;
      startedAt: string;
      mode?: CallMode;
      isGroup?: boolean;
      conversationId?: string;
    }
  | {
      kind: 'outgoing';
      callId: string;
      calleeId: string;
      roomName: string;
      startedAt: string;
      mode?: CallMode;
      isGroup?: boolean;
      conversationId?: string;
    }
  | {
      kind: 'connecting';
      callId: string;
      roomName: string;
      livekitUrl: string;
      token: string;
      peerId: string;
      startedAt: string;
      connectedAt?: string;
      mode?: CallMode;
      isGroup?: boolean;
      conversationId?: string;
      hostId?: string;
      participants?: string[];
    }
  | {
      kind: 'active';
      callId: string;
      roomName: string;
      livekitUrl: string;
      token: string;
      peerId: string;
      startedAt: string;
      connectedAt: string;
      mode?: CallMode;
      isGroup?: boolean;
      conversationId?: string;
      hostId?: string;
      participants?: string[];
    }
  | {
      kind: 'reconnecting';
      callId: string;
      roomName: string;
      livekitUrl: string;
      token: string;
      peerId: string;
      startedAt: string;
      connectedAt: string;
      mode?: CallMode;
      isGroup?: boolean;
      conversationId?: string;
      hostId?: string;
      participants?: string[];
    }
  | { kind: 'ended'; callId: string; reason: string; duration: number };

export interface CallRecord {
  id: string;
  callerId: string;
  calleeId: string;
  roomName: string;
  state: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed' | 'timed_out' | 'cancelled';
  startedAt: string;
  acceptedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  endedBy?: string | null;
  endReason?: string | null;
  mode?: CallMode;
  conversationId?: string | null;
  hostId?: string | null;
  participants?: string[];
}

export interface StartCallResponse {
  call: CallRecord;
}

export interface StartGroupCallResponse {
  call: CallRecord;
  token: string;
  hostToken: string;
  livekitUrl: string;
  roomName: string;
}

export interface JoinGroupCallResponse {
  token: string;
  livekitUrl: string;
  roomName: string;
  call: CallRecord;
}

export interface AcceptCallResponse {
  call: CallRecord;
  callerToken: string;
  calleeToken: string;
  livekitUrl: string;
}

export interface RefreshTokenResponse {
  token: string;
  livekitUrl: string;
  roomName: string;
}
