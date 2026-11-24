export type CallState =
  | { kind: 'idle' }
  | {
      kind: 'incoming';
      callId: string;
      callerId: string;
      roomName: string;
      startedAt: string;
    }
  | {
      kind: 'outgoing';
      callId: string;
      calleeId: string;
      roomName: string;
      startedAt: string;
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
    }
  | { kind: 'ended'; callId: string; reason: string; duration: number };

export interface CallRecord {
  id: string;
  callerId: string;
  calleeId: string;
  roomName: string;
  state: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed' | 'timed_out';
  startedAt: string;
  acceptedAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  endedBy?: string | null;
  endReason?: string | null;
}

export interface StartCallResponse {
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
