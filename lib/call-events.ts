'use client';

import { useWsEvent } from '@/hooks/use-ws';
import { useCallStore } from './call-store';
import { ringtone } from './ringtone';
import { toast } from '@/components/ui/use-toast';

export function useCallEventHandlers() {
  const {
    state,
    setState,
    setIncomingRingtonePlaying,
    setPeerDisconnected,
    reset,
  } = useCallStore();

  // 1. call.ringing (callee receives)
  useWsEvent('call.ringing', (payload: any) => {
    if (!payload?.callId || !payload?.callerId) return;

    // If already in a call, ignore / busy
    const currentState = useCallStore.getState().state;
    if (currentState.kind !== 'idle') return;

    setState({
      kind: 'incoming',
      callId: payload.callId,
      callerId: payload.callerId,
      roomName: payload.roomName || `call-${payload.callId}`,
      startedAt: payload.startedAt || new Date().toISOString(),
    });

    ringtone.start();
    setIncomingRingtonePlaying(true);

    // Browser notification if tab is in background
    if (typeof document !== 'undefined' && document.hidden) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('Incoming voice call', {
            body: 'Incoming call on Nebron',
            icon: '/favicon.ico',
          });
        } catch {
          // Ignore notification error
        }
      }
    }
  });

  // 2. call.dialing (caller receives immediately on call initiation)
  useWsEvent('call.dialing', (payload: any) => {
    if (!payload?.callId || !payload?.calleeId) return;
    const currentState = useCallStore.getState().state;
    if (currentState.kind === 'idle') {
      setState({
        kind: 'outgoing',
        callId: payload.callId,
        calleeId: payload.calleeId,
        roomName: payload.roomName || `call-${payload.callId}`,
        startedAt: new Date().toISOString(),
      });
    }
  });

  // 3. call.accepted (caller receives when callee accepts)
  useWsEvent('call.accepted', (payload: any) => {
    if (!payload?.callId || !payload?.callerToken) return;
    ringtone.stop();
    setIncomingRingtonePlaying(false);

    const currentState = useCallStore.getState().state;
    const peerId =
      currentState.kind === 'outgoing' ? currentState.calleeId : '';
    const startedAt =
      currentState.kind === 'outgoing'
        ? currentState.startedAt
        : new Date().toISOString();

    setState({
      kind: 'connecting',
      callId: payload.callId,
      roomName: payload.roomName,
      livekitUrl: payload.livekitUrl,
      token: payload.callerToken,
      peerId,
      startedAt,
    });
  });

  // 4. call.connected (callee receives after accept)
  useWsEvent('call.connected', (payload: any) => {
    if (!payload?.callId || !payload?.calleeToken) return;
    ringtone.stop();
    setIncomingRingtonePlaying(false);

    const currentState = useCallStore.getState().state;
    const peerId =
      currentState.kind === 'incoming' ? currentState.callerId : '';
    const startedAt =
      currentState.kind === 'incoming'
        ? currentState.startedAt
        : new Date().toISOString();

    setState({
      kind: 'connecting',
      callId: payload.callId,
      roomName: payload.roomName,
      livekitUrl: payload.livekitUrl,
      token: payload.calleeToken,
      peerId,
      startedAt,
    });
  });

  // 5. call.rejected (caller receives)
  useWsEvent('call.rejected', (payload: any) => {
    ringtone.stop();
    setIncomingRingtonePlaying(false);
    toast({
      title: 'Call declined',
      description: 'The user declined the call.',
    });
    reset();
  });

  // 6. call.cancelled (callee receives when caller cancels before answer)
  useWsEvent('call.cancelled', (payload: any) => {
    ringtone.stop();
    setIncomingRingtonePlaying(false);
    toast({
      title: 'Call cancelled',
      description: 'The caller cancelled the call.',
    });
    reset();
  });

  // 7. call.ended (both receive when either party hangs up or call ends)
  useWsEvent('call.ended', (payload: any) => {
    ringtone.stop();
    setIncomingRingtonePlaying(false);
    const currentState = useCallStore.getState().state;
    if (currentState.kind !== 'idle') {
      toast({
        title: 'Call ended',
        description: payload?.reason ? `Reason: ${payload.reason}` : undefined,
      });
      reset();
    }
  });

  // 8. call.missed (callee receives when call timed out with no answer)
  useWsEvent('call.missed', (payload: any) => {
    ringtone.stop();
    setIncomingRingtonePlaying(false);
    toast({
      title: 'Missed call',
      description: 'You missed a voice call.',
    });
    reset();
  });

  // 9. call.peer_disconnected (received when peer drops connection)
  useWsEvent('call.peer_disconnected', (payload: any) => {
    const currentState = useCallStore.getState().state;
    if (
      currentState.kind === 'active' ||
      currentState.kind === 'connecting' ||
      currentState.kind === 'reconnecting'
    ) {
      setPeerDisconnected(true);
    }
  });
}
