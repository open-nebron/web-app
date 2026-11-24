'use client';

import React from 'react';
import {
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react';
import { useCallStore } from '@/lib/call-store';
import { voiceApi } from '@/lib/voice-api';
import { Button } from '@/components/ui/button';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Video,
  VideoOff,
  ScreenShare,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export interface CallControlsProps {
  callId: string;
  mode?: 'audio' | 'video';
  className?: string;
}

export function CallControls({ callId, mode = 'audio', className }: CallControlsProps) {
  const {
    setMuted,
    isDeafened,
    setDeafened,
    reset,
  } = useCallStore();

  const {
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
    localParticipant,
  } = useLocalParticipant();

  const room = useRoomContext();

  const handleToggleMic = async () => {
    if (!localParticipant) return;
    const next = !isMicrophoneEnabled;
    try {
      await localParticipant.setMicrophoneEnabled(next);
      setMuted(!next);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not toggle microphone';
      toast({
        variant: 'destructive',
        title: 'Microphone error',
        description: message,
      });
    }
  };

  const handleToggleSpeaker = () => {
    setDeafened(!isDeafened);
  };

  const handleToggleCamera = async () => {
    if (!localParticipant) return;
    const next = !isCameraEnabled;
    try {
      await localParticipant.setCameraEnabled(next);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not toggle camera';
      toast({
        variant: 'destructive',
        title: 'Camera error',
        description: message,
      });
    }
  };

  const handleToggleScreenShare = async () => {
    if (!localParticipant) return;
    const next = !isScreenShareEnabled;
    try {
      await localParticipant.setScreenShareEnabled(next);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not toggle screen share';
      toast({
        variant: 'destructive',
        title: 'Screen share error',
        description: message,
      });
    }
  };

  const handleEndCall = async () => {
    try {
      await voiceApi.endCall(callId);
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

  return (
    <div className={cn('flex items-center justify-center gap-3 pt-2', className)}>
      {/* Mic toggle */}
      <Button
        type="button"
        variant={isMicrophoneEnabled ? 'outline' : 'secondary'}
        size="icon"
        className="w-12 h-12 rounded-full shadow-sm"
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

      {/* Video toggle (video mode only) */}
      {mode === 'video' && (
        <Button
          type="button"
          variant={isCameraEnabled ? 'outline' : 'secondary'}
          size="icon"
          className="w-12 h-12 rounded-full shadow-sm"
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
      )}

      {/* Screen share toggle (video mode only) */}
      {mode === 'video' && (
        <Button
          type="button"
          variant={isScreenShareEnabled ? 'secondary' : 'outline'}
          size="icon"
          className={cn(
            'w-12 h-12 rounded-full shadow-sm transition-colors',
            isScreenShareEnabled && 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          onClick={handleToggleScreenShare}
          title={isScreenShareEnabled ? 'Stop screen share' : 'Share screen'}
          aria-label={isScreenShareEnabled ? 'Stop screen share' : 'Share screen'}
        >
          <ScreenShare className="w-5 h-5" />
        </Button>
      )}

      {/* Speaker toggle */}
      <Button
        type="button"
        variant={isDeafened ? 'secondary' : 'outline'}
        size="icon"
        className="w-12 h-12 rounded-full shadow-sm"
        onClick={handleToggleSpeaker}
        title={isDeafened ? 'Unmute speaker' : 'Mute speaker'}
        aria-label={isDeafened ? 'Unmute speaker' : 'Mute speaker'}
      >
        {isDeafened ? (
          <VolumeX className="w-5 h-5 text-destructive" />
        ) : (
          <Volume2 className="w-5 h-5 text-foreground" />
        )}
      </Button>

      {/* End call */}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="w-14 h-14 rounded-full shadow-md hover:scale-105 transition-transform"
        onClick={handleEndCall}
        title="End call"
        aria-label="End call"
      >
        <PhoneOff className="w-6 h-6" />
      </Button>
    </div>
  );
}
