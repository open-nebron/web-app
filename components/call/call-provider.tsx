'use client';

import React, { useEffect } from 'react';
import { useCallEventHandlers } from '@/lib/call-events';
import { useCallStore } from '@/lib/call-store';
import { voiceApi } from '@/lib/voice-api';
import { useAuthStore } from '@/lib/auth-store';
import { ringtone } from '@/lib/ringtone';
import { CallOverlay } from './call-overlay';

export function CallProvider({ children }: { children: React.ReactNode }) {
  useCallEventHandlers();

  // App crash / refresh recovery
  useEffect(() => {
    let isMounted = true;

    async function recoverCall() {
      const currentUserId = useAuthStore.getState().user?.userId;
      if (!currentUserId) return;

      try {
        const res = await voiceApi.getActiveCall();
        if (!isMounted || !res?.call) return;

        const active = res.call;
        const currentCallState = useCallStore.getState().state;
        if (currentCallState.kind !== 'idle') return;

        if (active.state === 'ringing') {
          if (active.calleeId === currentUserId) {
            useCallStore.getState().setState({
              kind: 'incoming',
              callId: active.id,
              callerId: active.callerId,
              roomName: active.roomName,
              startedAt: active.startedAt,
            });
            ringtone.start();
            useCallStore.getState().setIncomingRingtonePlaying(true);
          } else if (active.callerId === currentUserId) {
            useCallStore.getState().setState({
              kind: 'outgoing',
              callId: active.id,
              calleeId: active.calleeId,
              roomName: active.roomName,
              startedAt: active.startedAt,
            });
          }
        } else if (active.state === 'accepted') {
          const isCaller = active.callerId === currentUserId;
          const peerId = isCaller ? active.calleeId : active.callerId;
          const tokens = await voiceApi.refreshTokens(active.id);
          if (!isMounted) return;

          useCallStore.getState().setState({
            kind: 'connecting',
            callId: active.id,
            roomName: tokens.roomName || active.roomName,
            livekitUrl: tokens.livekitUrl,
            token: tokens.token,
            peerId,
            startedAt: active.startedAt,
            connectedAt: active.acceptedAt || new Date().toISOString(),
          });
        }
      } catch {
        // No active call or network error
      }
    }

    recoverCall();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      {children}
      <CallOverlay />
    </>
  );
}
