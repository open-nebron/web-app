'use client';

import React, { useState, useEffect } from 'react';
import '@livekit/components-styles';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useRemoteParticipants,
  useLocalParticipant,
  useRoomContext,
  ParticipantContext,
  ConnectionQualityIndicator,
} from '@livekit/components-react';
import { useCallStore } from '@/lib/call-store';
import { voiceApi } from '@/lib/voice-api';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertCircle, Wifi } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { CallControls } from './call-controls';
import { cn } from '@/lib/utils';

export interface ActiveCallScreenProps {
  callId: string;
  roomName: string;
  livekitUrl: string;
  token: string;
  peerId: string;
  startedAt: string;
  connectedAt?: string;
  mode?: 'audio' | 'video';
}

function CallActiveUI({
  callId,
  peerId,
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
    peerDisconnected,
    setPeerDisconnected,
  } = useCallStore();

  const { data: peerUser } = useUser(peerId);
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const peerParticipant = remoteParticipants[0];
  const activeParticipant = peerParticipant || localParticipant;
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
          {activeParticipant ? (
            <ParticipantContext.Provider value={activeParticipant}>
              <ConnectionQualityIndicator participant={activeParticipant} />
            </ParticipantContext.Provider>
          ) : (
            <Wifi className="w-3.5 h-3.5" />
          )}
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

      {/* Reusable Call Controls */}
      <CallControls callId={callId} mode="audio" />
    </div>
  );
}

function VideoCallUI({
  callId,
  peerId,
  connectedAt,
}: {
  callId: string;
  peerId: string;
  connectedAt?: string;
}) {
  const { state, setState, peerDisconnected, setPeerDisconnected } = useCallStore();
  const { data: peerUser } = useUser(peerId);
  const room = useRoomContext();
  const [durationSeconds, setDurationSeconds] = useState(0);

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

  useEffect(() => {
    const startTime = connectedAt ? new Date(connectedAt).getTime() : Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDurationSeconds(Math.max(0, elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [connectedAt]);

  const displayName = peerUser?.name || peerUser?.username || 'Video Call';
  const formattedDuration = `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60)
    .toString()
    .padStart(2, '0')}`;

  const isReconnecting = state.kind === 'reconnecting';

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground relative select-none">
      {/* Top Bar */}
      <div className="h-14 border-b px-4 flex items-center justify-between bg-card/80 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h3 className="text-sm font-semibold leading-none">{displayName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{formattedDuration}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {peerDisconnected && (
            <span className="text-xs text-amber-500 font-medium animate-pulse">
              Peer reconnecting...
            </span>
          )}
          {isReconnecting && (
            <span className="text-xs text-destructive font-medium animate-pulse">
              Reconnecting...
            </span>
          )}
        </div>
      </div>

      {/* Main Video Conference Grid with PiP & Avatar placeholders */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-h-0 bg-black/90">
        <VideoConference />
      </div>

      {/* Bottom Controls */}
      <div className="py-3 px-4 bg-card/90 backdrop-blur-md border-t flex justify-center shrink-0 z-20">
        <CallControls callId={callId} mode="video" />
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
  mode = 'audio',
}: ActiveCallScreenProps) {
  const { state, setState, isDeafened, reset } = useCallStore();

  const handleConnected = () => {
    if (state.kind === 'connecting') {
      setState({
        ...state,
        kind: 'active',
        connectedAt: connectedAt || new Date().toISOString(),
        mode,
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
          mode,
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
    <div
      className={cn(
        'fixed inset-0 z-50 flex',
        mode === 'video'
          ? 'w-screen h-screen bg-background'
          : 'items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200'
      )}
    >
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        audio={true}
        video={mode === 'video'}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        onError={handleError}
        className={mode === 'video' ? 'w-full h-full flex flex-col' : undefined}
      >
        <RoomAudioRenderer muted={isDeafened} volume={isDeafened ? 0 : 1} />
        {mode === 'video' ? (
          <VideoCallUI
            callId={callId}
            peerId={peerId}
            connectedAt={connectedAt}
          />
        ) : (
          <CallActiveUI
            callId={callId}
            peerId={peerId}
            startedAt={startedAt}
            connectedAt={connectedAt}
          />
        )}
      </LiveKitRoom>
    </div>
  );
}
