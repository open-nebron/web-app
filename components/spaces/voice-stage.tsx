'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RoomEvent, Track, type Participant, type TrackPublication } from 'livekit-client';
import {
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  Users,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { spacesApi, type SpaceChannel } from '@/lib/spaces-api';
import { useSpacesStore } from '@/lib/spaces-store';
import { useUser } from '@/hooks/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn, normalizeStorageUrl } from '@/lib/utils';
import {
  getActiveSpaceVoiceRoom,
  leaveSpaceVoice,
  toggleSpaceVoiceCamera,
  toggleSpaceVoiceMic,
  toggleSpaceVoiceScreenShare,
} from './voice-channel-panel';

function AttachedMediaTrack({
  publication,
  muted = false,
  className,
}: {
  publication?: TrackPublication;
  muted?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const track = publication?.track;

  useEffect(() => {
    const el = videoRef.current;
    if (!track || !el) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={cn('w-full h-full object-cover', className)}
    />
  );
}

function StageParticipantCard({
  participant,
  isSpeaking,
}: {
  participant: Participant;
  isSpeaking: boolean;
}) {
  const { data: user } = useUser(participant.identity);
  const displayName = user?.name || user?.username || participant.identity.slice(0, 8);
  const initial = (displayName[0] || 'U').toUpperCase();

  const camPub = participant.getTrackPublication(Track.Source.Camera);
  const screenPub = participant.getTrackPublication(Track.Source.ScreenShare);
  const micPub = participant.getTrackPublication(Track.Source.Microphone);

  const hasVideo = Boolean(camPub?.track && !camPub.isMuted);
  const hasScreen = Boolean(screenPub?.track && !screenPub.isMuted);
  const isMicMuted = !micPub || micPub.isMuted;

  return (
    <div
      data-testid={`voice-participant-${participant.identity}`}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border bg-card aspect-video min-h-[160px] overflow-hidden transition-all',
        isSpeaking
          ? 'border-emerald-500 ring-2 ring-emerald-500/70 shadow-lg'
          : 'border-border/70'
      )}
    >
      {hasScreen ? (
        <AttachedMediaTrack publication={screenPub} muted={participant.isLocal} />
      ) : hasVideo ? (
        <AttachedMediaTrack publication={camPub} muted={participant.isLocal} />
      ) : (
        <Avatar
          className={cn(
            'w-16 h-16 border-2',
            isSpeaking ? 'border-emerald-500' : 'border-border/60'
          )}
        >
          {user?.avatarUrl && (
            <AvatarImage src={normalizeStorageUrl(user.avatarUrl)} alt={displayName} />
          )}
          <AvatarFallback className="text-lg font-bold">{initial}</AvatarFallback>
        </Avatar>
      )}

      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-background/80 backdrop-blur-sm text-xs">
        <span className="font-medium truncate">
          {displayName}
          {participant.isLocal ? ' (You)' : ''}
        </span>
        {isMicMuted ? (
          <MicOff className="w-3.5 h-3.5 text-destructive shrink-0" />
        ) : (
          <Mic className={cn('w-3.5 h-3.5 shrink-0', isSpeaking ? 'text-emerald-500' : 'text-foreground')} />
        )}
      </div>
    </div>
  );
}

interface VoiceStageProps {
  spaceId: string;
  spaceName: string;
  channel: SpaceChannel;
  canConnect: boolean;
  canSpeakPerm: boolean;
  canVideoPerm: boolean;
}

export function VoiceStage({
  spaceId,
  spaceName,
  channel,
  canConnect,
  canSpeakPerm,
  canVideoPerm,
}: VoiceStageProps) {
  const activeVoice = useSpacesStore((s) => s.activeVoice);
  const voiceConnectionState = useSpacesStore((s) => s.voiceConnectionState);
  const isMuted = useSpacesStore((s) => s.isMuted);
  const isDeafened = useSpacesStore((s) => s.isDeafened);
  const isCameraEnabled = useSpacesStore((s) => s.isCameraEnabled);
  const isScreenShareEnabled = useSpacesStore((s) => s.isScreenShareEnabled);
  const participantsSummary = useSpacesStore(
    (s) => s.participantsByChannel[channel.id] || []
  );
  const setActiveVoice = useSpacesStore((s) => s.setActiveVoice);
  const setDeafened = useSpacesStore((s) => s.setDeafened);

  const [isJoining, setIsJoining] = useState(false);
  const [showParticipantsDrawer, setShowParticipantsDrawer] = useState(false);
  const [, setTick] = useState(0);

  const isConnectedToThisChannel = activeVoice?.channelId === channel.id;
  const room = isConnectedToThisChannel ? getActiveSpaceVoiceRoom() : null;

  useEffect(() => {
    if (!room) return;
    const refresh = () => setTick((t) => t + 1);
    room.on(RoomEvent.ParticipantConnected, refresh);
    room.on(RoomEvent.ParticipantDisconnected, refresh);
    room.on(RoomEvent.TrackSubscribed, refresh);
    room.on(RoomEvent.TrackUnsubscribed, refresh);
    room.on(RoomEvent.TrackMuted, refresh);
    room.on(RoomEvent.TrackUnmuted, refresh);
    room.on(RoomEvent.LocalTrackPublished, refresh);
    room.on(RoomEvent.LocalTrackUnpublished, refresh);
    room.on(RoomEvent.ActiveSpeakersChanged, refresh);
    return () => {
      room.off(RoomEvent.ParticipantConnected, refresh);
      room.off(RoomEvent.ParticipantDisconnected, refresh);
      room.off(RoomEvent.TrackSubscribed, refresh);
      room.off(RoomEvent.TrackUnsubscribed, refresh);
      room.off(RoomEvent.TrackMuted, refresh);
      room.off(RoomEvent.TrackUnmuted, refresh);
      room.off(RoomEvent.LocalTrackPublished, refresh);
      room.off(RoomEvent.LocalTrackUnpublished, refresh);
      room.off(RoomEvent.ActiveSpeakersChanged, refresh);
    };
  }, [room]);

  const handleJoinVoice = async () => {
    if (!canConnect) {
      toast({
        variant: 'destructive',
        title: 'Cannot connect',
        description: 'Missing CONNECT permission for this voice channel.',
      });
      return;
    }

    try {
      setIsJoining(true);
      const res = await spacesApi.joinVoiceChannel(spaceId, channel.id);
      setActiveVoice({
        spaceId,
        spaceName,
        channelId: channel.id,
        channelName: channel.name,
        roomName: res.roomName,
        livekitUrl: res.livekitUrl,
        token: res.token,
        canPublish: res.canPublish,
        joinedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Failed to join voice',
        description: err instanceof Error ? err.message : 'Unable to connect',
      });
    } finally {
      setIsJoining(false);
    }
  };

  const liveParticipants: Participant[] = room
    ? [room.localParticipant, ...Array.from(room.remoteParticipants.values())]
    : [];
  const speakingIdentities = new Set(room?.activeSpeakers.map((p) => p.identity) || []);
  const localCamPub = room?.localParticipant.getTrackPublication(Track.Source.Camera);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b px-5 flex items-center justify-between shrink-0 bg-card/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <Volume2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <h1 className="font-bold text-base truncate">{channel.name}</h1>
          {isConnectedToThisChannel && (
            <Badge
              variant="secondary"
              className="text-[11px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
              data-testid="voice-stage-status-badge"
            >
              {voiceConnectionState === 'connected' ? 'Connected' : 'Connecting'}
            </Badge>
          )}
        </div>

        <Button
          type="button"
          variant={showParticipantsDrawer ? 'secondary' : 'outline'}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setShowParticipantsDrawer((v) => !v)}
        >
          <Users className="w-3.5 h-3.5" />
          <span>{Math.max(liveParticipants.length, participantsSummary.length)} connected</span>
        </Button>
      </header>

      {/* Main Stage */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
          {!isConnectedToThisChannel ? (
            <div className="max-w-md text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Volume2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold">{channel.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {canConnect
                    ? 'Join voice to talk, stream video, or share your screen with space members.'
                    : 'You do not have permission to connect to this voice channel.'}
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                disabled={!canConnect || isJoining}
                onClick={handleJoinVoice}
                data-testid="join-voice-channel-btn"
              >
                {isJoining ? 'Joining Voice...' : 'Join Voice'}
              </Button>
            </div>
          ) : liveParticipants.length > 0 ? (
            <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveParticipants.map((p) => (
                <StageParticipantCard
                  key={p.identity}
                  participant={p}
                  isSpeaking={speakingIdentities.has(p.identity)}
                />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Connecting to LiveKit room...</div>
          )}

          {/* Self-view PiP when local camera enabled */}
          {isConnectedToThisChannel && isCameraEnabled && localCamPub?.track && (
            <div
              data-testid="voice-self-pip"
              className="fixed bottom-24 right-6 w-44 aspect-video rounded-xl overflow-hidden border-2 border-primary shadow-xl bg-black z-30"
            >
              <AttachedMediaTrack publication={localCamPub} muted={true} />
            </div>
          )}
        </div>

        {/* Optional Participants Drawer */}
        {showParticipantsDrawer && (
          <aside className="w-60 border-l bg-card/50 p-3 overflow-y-auto shrink-0 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Participants ({liveParticipants.length})
            </p>
            {liveParticipants.map((p) => (
              <div key={p.identity} className="text-xs px-2 py-1.5 rounded border bg-background">
                {p.identity}
                {p.isLocal ? ' (You)' : ''}
              </div>
            ))}
          </aside>
        )}
      </div>

      {/* Controls Bar */}
      {isConnectedToThisChannel && (
        <div className="h-20 border-t px-4 flex items-center justify-center gap-3 bg-card/60 shrink-0">
          <Button
            type="button"
            variant={isMuted ? 'destructive' : 'outline'}
            size="icon"
            disabled={!canSpeakPerm}
            onClick={() => toggleSpaceVoiceMic()}
            className="w-11 h-11 rounded-full"
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            type="button"
            variant={isDeafened ? 'destructive' : 'outline'}
            size="icon"
            onClick={() => setDeafened(!isDeafened)}
            className="w-11 h-11 rounded-full"
            aria-label={isDeafened ? 'Undeafen audio' : 'Deafen audio'}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>

          <Button
            type="button"
            variant={isCameraEnabled ? 'default' : 'outline'}
            size="icon"
            disabled={!canVideoPerm}
            onClick={() => toggleSpaceVoiceCamera()}
            className="w-11 h-11 rounded-full"
            aria-label={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isCameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          <Button
            type="button"
            variant={isScreenShareEnabled ? 'default' : 'outline'}
            size="icon"
            disabled={!canVideoPerm}
            onClick={() => toggleSpaceVoiceScreenShare()}
            className="w-11 h-11 rounded-full"
            aria-label={isScreenShareEnabled ? 'Stop screen share' : 'Share screen'}
          >
            <ScreenShare className="w-5 h-5" />
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={leaveSpaceVoice}
            className="h-11 px-5 rounded-full gap-2"
            data-testid="leave-voice-channel-btn"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Disconnect</span>
          </Button>
        </div>
      )}
    </div>
  );
}
