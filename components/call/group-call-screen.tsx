'use client';

import React, { useState, useEffect } from 'react';
import '@livekit/components-styles';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useSpeakingParticipants,
  useLocalParticipant,
  useRoomContext,
  ParticipantContext,
  ConnectionQualityIndicator,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useCallStore } from '@/lib/call-store';
import { useAuthStore } from '@/lib/auth-store';
import { voiceApi } from '@/lib/voice-api';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Volume2,
  VolumeX,
  PhoneOff,
  Users,
  Shield,
  Loader2,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { Participant } from 'livekit-client';

export interface GroupCallScreenProps {
  callId: string;
  roomName: string;
  livekitUrl: string;
  token: string;
  hostId?: string;
  conversationId?: string;
  startedAt: string;
  connectedAt?: string;
  mode?: 'audio' | 'video';
}

function ParticipantCard({
  participant,
  hostId,
  isSpeaking,
}: {
  participant: Participant;
  hostId?: string;
  isSpeaking: boolean;
}) {
  const { data: user } = useUser(participant.identity);
  const displayName = user?.name || user?.username || participant.identity.slice(0, 8);
  const initial = (displayName[0] || 'U').toUpperCase();
  const isHost = participant.identity === hostId;
  const isLocal = participant.isLocal;

  // Check camera track publication
  const videoPublication = participant.getTrackPublication(Track.Source.Camera);
  const isCameraEnabled = videoPublication && !videoPublication.isMuted && videoPublication.isSubscribed;
  const videoTrack = videoPublication?.videoTrack;

  // Check mic track publication
  const audioPublication = participant.getTrackPublication(Track.Source.Microphone);
  const isMuted = !audioPublication || audioPublication.isMuted;

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl bg-card/60 backdrop-blur-sm border transition-all duration-300 overflow-hidden aspect-video min-h-[140px] max-h-[300px]',
        isSpeaking
          ? 'border-emerald-500 ring-2 ring-emerald-500/80 shadow-lg shadow-emerald-500/20'
          : 'border-border/60 shadow-sm'
      )}
    >
      {/* Video stream if camera enabled */}
      {isCameraEnabled && videoTrack ? (
        <div className="absolute inset-0 w-full h-full">
          <ParticipantContext.Provider value={participant}>
            <VideoTrack
              trackRef={{
                participant,
                source: Track.Source.Camera,
                publication: videoPublication,
              }}
              className="w-full h-full object-cover"
            />
          </ParticipantContext.Provider>
        </div>
      ) : (
        /* Avatar fallback when video is off / audio mode */
        <div className="flex flex-col items-center justify-center gap-2 z-10">
          <div className="relative">
            <Avatar className={cn(
              'w-16 h-16 sm:w-20 sm:h-20 border-2 transition-transform',
              isSpeaking ? 'border-emerald-500 scale-105' : 'border-border/60'
            )}>
              <AvatarImage src={user?.avatarUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bottom overlay info bar */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white z-20">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-medium truncate max-w-[120px]">{displayName}</span>
          {isLocal && (
            <span className="text-[10px] bg-primary/80 px-1 rounded font-semibold text-primary-foreground">
              You
            </span>
          )}
          {isHost && (
            <span className="text-[10px] bg-amber-500/80 px-1 rounded font-semibold text-black flex items-center gap-0.5">
              <Shield className="w-2.5 h-2.5" />
              Host
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isMuted ? (
            <MicOff className="w-3.5 h-3.5 text-destructive" />
          ) : isSpeaking ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ) : (
            <Mic className="w-3.5 h-3.5 text-white/70" />
          )}
          <ParticipantContext.Provider value={participant}>
            <ConnectionQualityIndicator participant={participant} />
          </ParticipantContext.Provider>
        </div>
      </div>
    </div>
  );
}

function GroupCallContent({
  callId,
  roomName,
  hostId,
  mode = 'audio',
  connectedAt,
}: {
  callId: string;
  roomName: string;
  hostId?: string;
  mode?: 'audio' | 'video';
  connectedAt?: string;
}) {
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const { setMuted, isDeafened, setDeafened, reset } = useCallStore();
  const room = useRoomContext();
  const participants = useParticipants();
  const speakingParticipants = useSpeakingParticipants();
  const {
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    localParticipant,
  } = useLocalParticipant();

  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isEndingAll, setIsEndingAll] = useState(false);

  const isHost = currentUserId && hostId && currentUserId === hostId;

  // Duration timer
  useEffect(() => {
    const startTime = connectedAt ? new Date(connectedAt).getTime() : Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDurationSeconds(Math.max(0, elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [connectedAt]);

  const formattedDuration = `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60)
    .toString()
    .padStart(2, '0')}`;

  const handleToggleMic = async () => {
    if (!localParticipant) return;
    const next = !isMicrophoneEnabled;
    try {
      await localParticipant.setMicrophoneEnabled(next);
      setMuted(!next);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Microphone error',
        description: err instanceof Error ? err.message : 'Could not toggle microphone',
      });
    }
  };

  const handleToggleCamera = async () => {
    if (!localParticipant) return;
    const next = !isCameraEnabled;
    try {
      await localParticipant.setCameraEnabled(next);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Camera error',
        description: err instanceof Error ? err.message : 'Could not toggle camera',
      });
    }
  };

  const handleToggleScreenShare = async () => {
    if (!localParticipant) return;
    const next = !isScreenShareEnabled;
    try {
      await localParticipant.setScreenShareEnabled(next);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Screen share error',
        description: err instanceof Error ? err.message : 'Could not toggle screen share',
      });
    }
  };

  const handleLeaveCall = async () => {
    try {
      setIsLeaving(true);
      await voiceApi.leaveGroupCall(callId);
    } catch {
      // Best-effort
    }
    try {
      room?.disconnect();
    } catch {
      // Ignore
    }
    reset();
  };

  const handleEndCallForEveryone = async () => {
    try {
      setIsEndingAll(true);
      await voiceApi.endGroupCall(callId);
    } catch {
      // Best-effort
    }
    try {
      room?.disconnect();
    } catch {
      // Ignore
    }
    reset();
  };

  // Determine grid columns based on participant count
  const count = participants.length;
  const gridLayoutClass =
    count <= 1
      ? 'grid-cols-1 max-w-xl mx-auto'
      : count === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto'
      : count <= 4
      ? 'grid-cols-2 max-w-4xl mx-auto'
      : count <= 6
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground relative select-none">
      {/* Top Header Bar */}
      <div className="h-14 border-b px-4 flex items-center justify-between bg-card/80 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold leading-none">Group Call</h3>
              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <Users className="w-3 h-3" />
                {count}/10
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{formattedDuration}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>LiveKit Room Active</span>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-black/90 min-h-0">
        <div className={cn('grid gap-4 w-full h-full auto-rows-fr', gridLayoutClass)}>
          {participants.map((p) => (
            <ParticipantCard
              key={p.identity}
              participant={p}
              hostId={hostId}
              isSpeaking={speakingParticipants.some((sp) => sp.identity === p.identity)}
            />
          ))}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="py-3 px-4 bg-card/90 backdrop-blur-md border-t flex items-center justify-center gap-3 shrink-0 z-20 flex-wrap">
        {/* Mic toggle */}
        <Button
          type="button"
          variant={isMicrophoneEnabled ? 'outline' : 'secondary'}
          size="icon"
          className="w-11 h-11 rounded-full shadow-sm"
          onClick={handleToggleMic}
          title={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
          aria-label={isMicrophoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {isMicrophoneEnabled ? (
            <Mic className="w-5 h-5 text-foreground" />
          ) : (
            <MicOff className="w-5 h-5 text-destructive" />
          )}
        </Button>

        {/* Video toggles if video mode */}
        {mode === 'video' && (
          <>
            <Button
              type="button"
              variant={isCameraEnabled ? 'outline' : 'secondary'}
              size="icon"
              className="w-11 h-11 rounded-full shadow-sm"
              onClick={handleToggleCamera}
              title={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
              aria-label={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isCameraEnabled ? (
                <Video className="w-5 h-5 text-foreground" />
              ) : (
                <VideoOff className="w-5 h-5 text-destructive" />
              )}
            </Button>

            <Button
              type="button"
              variant={isScreenShareEnabled ? 'secondary' : 'outline'}
              size="icon"
              className={cn(
                'w-11 h-11 rounded-full shadow-sm transition-colors',
                isScreenShareEnabled && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              onClick={handleToggleScreenShare}
              title={isScreenShareEnabled ? 'Stop screen share' : 'Share screen'}
              aria-label={isScreenShareEnabled ? 'Stop screen share' : 'Share screen'}
            >
              <ScreenShare className="w-5 h-5" />
            </Button>
          </>
        )}

        {/* Speaker deafen toggle */}
        <Button
          type="button"
          variant={isDeafened ? 'secondary' : 'outline'}
          size="icon"
          className="w-11 h-11 rounded-full shadow-sm"
          onClick={() => setDeafened(!isDeafened)}
          title={isDeafened ? 'Unmute speaker' : 'Mute speaker'}
          aria-label={isDeafened ? 'Unmute speaker' : 'Mute speaker'}
        >
          {isDeafened ? (
            <VolumeX className="w-5 h-5 text-destructive" />
          ) : (
            <Volume2 className="w-5 h-5 text-foreground" />
          )}
        </Button>

        {/* Leave call button (all participants) */}
        <Button
          type="button"
          variant="secondary"
          className="h-11 px-4 rounded-full gap-2 font-medium shadow-sm hover:bg-destructive/15 hover:text-destructive transition-colors"
          onClick={handleLeaveCall}
          disabled={isLeaving || isEndingAll}
          title="Leave group call"
          aria-label="Leave group call"
        >
          {isLeaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneOff className="w-4 h-4" />}
          <span>Leave Call</span>
        </Button>

        {/* Host controls: End call for everyone */}
        {isHost && (
          <Button
            type="button"
            variant="destructive"
            className="h-11 px-4 rounded-full gap-2 font-medium shadow-md hover:scale-105 transition-transform"
            onClick={handleEndCallForEveryone}
            disabled={isLeaving || isEndingAll}
            title="End call for everyone"
            aria-label="End call for everyone"
          >
            {isEndingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneOff className="w-4 h-4" />}
            <span>End For Everyone</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export function GroupCallScreen({
  callId,
  roomName,
  livekitUrl,
  token,
  hostId,
  startedAt,
  connectedAt,
  mode = 'audio',
}: GroupCallScreenProps) {
  const { state, setState, isDeafened, reset } = useCallStore();

  const handleConnected = () => {
    if (state.kind === 'connecting') {
      setState({
        ...state,
        kind: 'active',
        connectedAt: connectedAt || new Date().toISOString(),
        mode,
        isGroup: true,
      });
    }
  };

  const handleDisconnected = async () => {
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
          peerId: hostId || '',
          startedAt,
          connectedAt: connectedAt || new Date().toISOString(),
          mode,
          isGroup: true,
          hostId,
        });
        return;
      } catch {
        toast({ title: 'Group call ended' });
        reset();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex w-screen h-screen bg-background animate-in fade-in duration-200">
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        audio={true}
        video={mode === 'video'}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        className="w-full h-full flex flex-col"
      >
        <RoomAudioRenderer muted={isDeafened} volume={isDeafened ? 0 : 1} />
        <GroupCallContent
          callId={callId}
          roomName={roomName}
          hostId={hostId}
          mode={mode}
          connectedAt={connectedAt}
        />
      </LiveKitRoom>
    </div>
  );
}
