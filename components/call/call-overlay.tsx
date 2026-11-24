'use client';

import React from 'react';
import { useCallStore } from '@/lib/call-store';
import { IncomingCallModal } from './incoming-call-modal';
import { OutgoingCallScreen } from './outgoing-call-screen';
import { ActiveCallScreen } from './active-call-screen';

export function CallOverlay() {
  const state = useCallStore((s) => s.state);

  if (state.kind === 'idle') {
    return null;
  }

  if (state.kind === 'incoming') {
    return (
      <IncomingCallModal
        callId={state.callId}
        callerId={state.callerId}
        roomName={state.roomName}
        startedAt={state.startedAt}
      />
    );
  }

  if (state.kind === 'outgoing') {
    return (
      <OutgoingCallScreen
        callId={state.callId}
        calleeId={state.calleeId}
        roomName={state.roomName}
        startedAt={state.startedAt}
      />
    );
  }

  if (
    state.kind === 'connecting' ||
    state.kind === 'active' ||
    state.kind === 'reconnecting'
  ) {
    return (
      <ActiveCallScreen
        callId={state.callId}
        roomName={state.roomName}
        livekitUrl={state.livekitUrl}
        token={state.token}
        peerId={state.peerId}
        startedAt={state.startedAt}
        connectedAt={state.connectedAt}
      />
    );
  }

  return null;
}
