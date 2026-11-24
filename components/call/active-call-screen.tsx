'use client';

import React, { useState, useEffect } from 'react';
import '@livekit/components-styles';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
  ConnectionQualityIndicator,
} from '@livekit/components-react';
import { useCallStore } from '@/lib/call-store';
import { voiceApi } from '@/lib/voice-api';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  AlertCircle,
  Wifi,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ActiveCallScreenProps {
  callId: string;
  roomName: string;
  livekitUrl: string;
  token: string;
  peerId: string;
  startedAt: string;
  connectedAt?: string;
}

function CallActiveUI({
  callId,
  peerId,
  startedAt,
  connectedAt,
}: {
  callId: string;
  peerId: string;
  startedAt: string;
  connectedAt?: string;
}) {
  const {
    state,
    setState,
    isMuted,
    setMuted,
    isDeafened,
    setDeafened,
    peerDisconnected,
    setPeerDisconnected,
    reset,
  } = useCallStore();

  const { data: peerUser } = useUser(peerId);
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const [durationSeconds, setDurationSeconds] = useState(0);

  // Sync LiveKit room reconnecting events
  useEffect(() => {
    if (!room) return;

    const handleReconnecting = () => {
      if (state.kind === 'active') {
        setState({
          ...state,
          kind: 'reconnecting',
        });
      }
    };

    const handleReconnected = () => {
      setPeerDisconnected(false);
      if (state.kind === 'reconnecting') {
        setState({
          ...state,
          kind: 'active',
        });
      }
    };

    room.on('reconnecting', handleReconnecting);
    room.on('reconnected', handleReconnected);

    return () => {
      room.off('reconnecting', handleReconnecting);
      room.off('reconnected', handleReconnected);
    };
  }, [room, state, setState, setPeerDisconnected]);

  // Compute duration based on connectedAt timestamp
  useEffect(() => {
    const startTime = connectedAt ? new Date(connectedAt).getTime() : Date.now();

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDurationSeconds(Math.max(0, elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [connectedAt]);

  const handleToggleMic = async () => {
    if (!localParticipant) return;
    const next = !isMicrophoneEnabled;
    try {
      await localParticipant.setMicrophoneEnabled(next);
      setMuted(!next);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Microphone error',
        description: err.message || 'Could not toggle microphone',
      });
    }
  };

  const handleToggleSpeaker = () => {
    setDeafened(!isDeafened);
  };

  const handleEndCall = async () => {
    try {
      await voiceApi.endCall(callId);
    } catch {
      // Best-effort
    }
    try {
      room.disconnect();
    } catch {
      // Ignore
    }
    reset();
  };

  const displayName = peerUser?.name || peerUser?.username || 'Voice Call';
  const initial = (displayName[0] || 'C').toUpperCase();

  const formattedDuration = `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60)
    .toString()
    .padStart(2, '0')}`;

  const isReconnecting = state.kind === 'reconnecting';

  return (
    <div className="w-full max-w-sm bg-card border shadow-2xl rounded-2xl p-6 text-center space-y-6 flex flex-col items-center relative">
      {/* Top Bar: Connection status indicator */}
      <div className="w-full flex items-center justify-between text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Encrypted Voice</span>
        </div>
        <div className="flex items-center gap-1">
          <ConnectionQualityIndicator />
        </div>
      </div>

      {/* Peer disconnected banner */}
      {peerDisconnected && (
        <div className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
          <span>Peer disconnected. Waiting for reconnect...</span>
        </div>
      )}

      {/* Reconnecting banner */}
      {isReconnecting && (
        <div className="w-full bg-destructive/10 border border-destructive/20 text-destructive text-xs px-3 py-2 rounded-lg flex items-center gap-2 text-left">
          <Wifi className="w-4 h-4 shrink-0 animate-pulse" />
          <span>Network dropped. Reconnecting audio...</span>
        </div>
      )}

      {/* Peer Avatar */}
      <div className="relative my-1">
        <Avatar className="w-24 h-24 border-4 border-background shadow-lg relative">
          <AvatarImage src={peerUser?.avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Peer Name & Duration */}
      <div className="space-y-1">
        <h3 className="text-lg font-bold tracking-tight">{displayName}</h3>
        <p className="text-xs text-muted-foreground">
          {peerUser?.username ? `@${peerUser.username}` : ''}
        </p>
        <p className="text-sm font-semibold tracking-wider text-foreground pt-1">
          {formattedDuration}
        </p>
      </div>

      {/* Call Controls */}
      <div className="flex items-center justify-center gap-4 pt-2">
        {/* Mic Mute Button */}
        <Button
          type="button"
          variant={isMicrophoneEnabled ? 'outline' : 'secondary'}
          size="icon"
          className="w-12 h-12 rounded-full shadow-sm"
          onClick={handleToggleMic}
          title={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicrophoneEnabled ? (
            <Mic className="w-5 h-5 text-foreground" />
          ) : (
            <MicOff className="w-5 h-5 text-destructive" />
          )}
        </Button>

        {/* End Call Button */}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="w-14 h-14 rounded-full shadow-md hover:scale-105 transition-transform"
          onClick={handleEndCall}
          title="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>

        {/* Speaker Deafen Button */}
        <Button
          type="button"
          variant={isDeafened ? 'secondary' : 'outline'}
          size="icon"
          className="w-12 h-12 rounded-full shadow-sm"
          onClick={handleToggleSpeaker}
          title={isDeafened ? 'Unmute speaker' : 'Mute speaker'}
        >
          {isDeafened ? (
            <VolumeX className="w-5 h-5 text-destructive" />
          ) : (
            <Volume2 className="w-5 h-5 text-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function ActiveCallScreen({
  callId,
  roomName,
  livekitUrl,
  token,
  peerId,
  startedAt,
  connectedAt,
}: ActiveCallScreenProps) {
  const { state, setState, isDeafened, reset } = useCallStore();

  const handleConnected = () => {
    if (state.kind === 'connecting') {
      setState({
        ...state,
        kind: 'active',
        connectedAt: connectedAt || new Date().toISOString(),
      });
    }
  };

  const handleDisconnected = async () => {
    // If disconnected unexpectedly, attempt token refresh
    const currentState = useCallStore.getState().state;
    if (
      currentState.kind === 'active' ||
      currentState.kind === 'connecting' ||
      currentState.kind === 'reconnecting'
    ) {
      try {
        const fresh = await voiceApi.refreshTokens(callId);
        setState({
          kind: 'reconnecting',
          callId,
          roomName: fresh.roomName || roomName,
          livekitUrl: fresh.livekitUrl,
          token: fresh.token,
          peerId,
          startedAt,
          connectedAt: connectedAt || new Date().toISOString(),
        });
        return;
      } catch {
        toast({ title: 'Call ended' });
        reset();
      }
    }
  };

  const handleError = (err: Error) => {
    console.error('[LiveKit] Room error:', err);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        audio={true}
        video={false}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={handleError}
      >
        <RoomAudioRenderer muted={isDeafened} volume={isDeafened ? 0 : 1} />
        <CallActiveUI
          callId={callId}
          peerId={peerId}
          startedAt={startedAt}
          connectedAt={connectedAt}
        />
      </LiveKitRoom>
    </div>
  );
}
