'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import '@livekit/components-styles';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useSpeakingParticipants,
} from '@livekit/components-react';
import { Track, type Room } from 'livekit-client';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Video, VideoOff, Radio } from 'lucide-react';
import { useSpacesStore } from '@/lib/spaces-store';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Shared controller so voice controls work anywhere (channel sidebar panel or voice room stage)
let activeRoomInstance: Room | null = null;

export function getActiveSpaceVoiceRoom(): Room | null {
  return activeRoomInstance;
}

export async function toggleSpaceVoiceMic(): Promise<void> {
  const store = useSpacesStore.getState();
  if (!store.activeVoice) return;
  if (!store.activeVoice.canPublish) {
    toast({
      variant: 'destructive',
      title: 'Speak permission disabled',
      description: 'You do not have permission to speak in this voice channel.',
    });
    return;
  }

  const nextMuted = !store.isMuted;
  store.setMuted(nextMuted);

  if (activeRoomInstance) {
    try {
      await activeRoomInstance.localParticipant.setMicrophoneEnabled(!nextMuted);
    } catch {
      // Headless / blocked device fallback keeps UI state synced
    }
  }
}

export async function toggleSpaceVoiceCamera(): Promise<void> {
  const store = useSpacesStore.getState();
  if (!store.activeVoice) return;
  const nextCam = !store.isCameraEnabled;
  store.setCameraEnabled(nextCam);

  if (activeRoomInstance) {
    try {
      await activeRoomInstance.localParticipant.setCameraEnabled(nextCam);
    } catch (err: unknown) {
      store.setCameraEnabled(false);
      toast({
        variant: 'destructive',
        title: 'Camera unavailable',
        description: err instanceof Error ? err.message : 'Could not access camera device.',
      });
    }
  }
}

export async function toggleSpaceVoiceScreenShare(): Promise<void> {
  const store = useSpacesStore.getState();
  if (!store.activeVoice) return;
  const nextShare = !store.isScreenShareEnabled;
  store.setScreenShareEnabled(nextShare);

  if (activeRoomInstance) {
    try {
      await activeRoomInstance.localParticipant.setScreenShareEnabled(nextShare);
    } catch (err: unknown) {
      store.setScreenShareEnabled(false);
      toast({
        variant: 'destructive',
        title: 'Screen share cancelled',
        description: err instanceof Error ? err.message : 'Could not share screen.',
      });
    }
  }
}

export function leaveSpaceVoice(): void {
  if (activeRoomInstance) {
    try {
      activeRoomInstance.disconnect();
    } catch {
      // Ignore
    }
    activeRoomInstance = null;
  }
  useSpacesStore.getState().clearActiveVoice();
}

function SpaceVoiceRoomBridge({
  channelId,
  canPublish,
}: {
  channelId: string;
  canPublish: boolean;
}) {
  const room = useRoomContext();
  const participants = useParticipants();
  const speaking = useSpeakingParticipants();
  const { isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const setChannelParticipants = useSpacesStore((s) => s.setChannelParticipants);
  const setMuted = useSpacesStore((s) => s.setMuted);
  const setCameraEnabled = useSpacesStore((s) => s.setCameraEnabled);
  const setScreenShareEnabled = useSpacesStore((s) => s.setScreenShareEnabled);

  useEffect(() => {
    activeRoomInstance = room;
    if (canPublish) {
      room.localParticipant.setMicrophoneEnabled(true).catch(() => {
        // Gracefully ignore missing physical audio hardware
      });
    }
    return () => {
      if (activeRoomInstance === room) {
        activeRoomInstance = null;
      }
    };
  }, [room, canPublish]);

  useEffect(() => {
    setMuted(!isMicrophoneEnabled);
  }, [isMicrophoneEnabled, setMuted]);

  useEffect(() => {
    setCameraEnabled(isCameraEnabled);
  }, [isCameraEnabled, setCameraEnabled]);

  useEffect(() => {
    setScreenShareEnabled(isScreenShareEnabled);
  }, [isScreenShareEnabled, setScreenShareEnabled]);

  useEffect(() => {
    const speakingIds = new Set(speaking.map((p) => p.identity));
    const mapped = participants.map((p) => {
      const micPub = p.getTrackPublication(Track.Source.Microphone);
      const camPub = p.getTrackPublication(Track.Source.Camera);
      const screenPub = p.getTrackPublication(Track.Source.ScreenShare);
      return {
        identity: p.identity,
        isSpeaking: speakingIds.has(p.identity),
        isMuted: !micPub || micPub.isMuted,
        isCameraEnabled: Boolean(camPub && !camPub.isMuted),
        isScreenShareEnabled: Boolean(screenPub && !screenPub.isMuted),
      };
    });
    setChannelParticipants(channelId, mapped);
  }, [channelId, participants, speaking, setChannelParticipants]);

  return null;
}

export function SpaceVoiceHost() {
  const activeVoice = useSpacesStore((s) => s.activeVoice);
  const isDeafened = useSpacesStore((s) => s.isDeafened);
  const setVoiceConnectionState = useSpacesStore((s) => s.setVoiceConnectionState);
  const clearActiveVoice = useSpacesStore((s) => s.clearActiveVoice);

  if (!activeVoice) {
    return null;
  }

  return (
    <div className="hidden" aria-hidden="true">
      <LiveKitRoom
        key={activeVoice.roomName}
        token={activeVoice.token}
        serverUrl={activeVoice.livekitUrl}
        connect={true}
        audio={false}
        video={false}
        onConnected={() => setVoiceConnectionState('connected')}
        onDisconnected={() => {
          activeRoomInstance = null;
          clearActiveVoice();
        }}
        onError={(err) => {
          toast({
            variant: 'destructive',
            title: 'Voice connection issue',
            description: err.message,
          });
        }}
      >
        <RoomAudioRenderer muted={isDeafened} volume={isDeafened ? 0 : 1} />
        <SpaceVoiceRoomBridge
          channelId={activeVoice.channelId}
          canPublish={activeVoice.canPublish}
        />
      </LiveKitRoom>
    </div>
  );
}

export function VoiceChannelPanel() {
  const activeVoice = useSpacesStore((s) => s.activeVoice);
  const voiceConnectionState = useSpacesStore((s) => s.voiceConnectionState);
  const isMuted = useSpacesStore((s) => s.isMuted);
  const isDeafened = useSpacesStore((s) => s.isDeafened);
  const isCameraEnabled = useSpacesStore((s) => s.isCameraEnabled);
  const setDeafened = useSpacesStore((s) => s.setDeafened);

  if (!activeVoice) return null;

  return (
    <div
      data-testid="voice-connected-panel"
      className="border-t bg-emerald-500/10 px-3 py-2.5 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/spaces/${activeVoice.spaceId}/channels/${activeVoice.channelId}`}
          className="min-w-0 flex-1 group"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <Radio className="w-3.5 h-3.5 shrink-0 animate-pulse" />
            <span className="truncate">
              {voiceConnectionState === 'connected' ? 'Voice Connected' : 'Connecting...'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate group-hover:underline">
            #{activeVoice.channelName}
          </p>
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={leaveSpaceVoice}
          aria-label="Leave voice channel"
          title="Leave voice channel"
          className="h-7 w-7 text-destructive hover:bg-destructive/15 shrink-0"
        >
          <PhoneOff className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={isMuted ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => toggleSpaceVoiceMic()}
          className="h-7 flex-1 text-xs px-2 gap-1"
          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span>{isMuted ? 'Muted' : 'Mic'}</span>
        </Button>

        <Button
          type="button"
          variant={isDeafened ? 'destructive' : 'outline'}
          size="icon"
          onClick={() => setDeafened(!isDeafened)}
          className="h-7 w-7 shrink-0"
          aria-label={isDeafened ? 'Undeafen audio' : 'Deafen audio'}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </Button>

        <Button
          type="button"
          variant={isCameraEnabled ? 'default' : 'outline'}
          size="icon"
          onClick={() => toggleSpaceVoiceCamera()}
          className={cn('h-7 w-7 shrink-0')}
          aria-label={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          title={isCameraEnabled ? 'Camera off' : 'Camera on'}
        >
          {isCameraEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}
