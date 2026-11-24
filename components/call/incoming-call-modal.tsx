'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { useCallStore } from '@/lib/call-store';
import { voiceApi } from '@/lib/voice-api';
import { ringtone } from '@/lib/ringtone';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Loader2, MicOff } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface IncomingCallModalProps {
  callId: string;
  callerId: string;
  roomName: string;
  startedAt: string;
  mode?: 'audio' | 'video';
}

export function IncomingCallModal({
  callId,
  callerId,
  roomName,
  startedAt,
  mode = 'audio',
}: IncomingCallModalProps) {
  const { setState, reset } = useCallStore();
  const { data: caller, isLoading } = useUser(callerId);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [ringSeconds, setRingSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      // Pre-check / request mic permission
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop track immediately as LiveKit will acquire its own stream
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch (micErr) {
        toast({
          variant: 'destructive',
          title: 'Microphone access required',
          description: 'Microphone access was denied. Please allow microphone access to talk.',
        });
        setIsAccepting(false);
        return;
      }

      const res = await voiceApi.acceptCall(callId);
      ringtone.stop();

      setState({
        kind: 'connecting',
        callId,
        roomName: res.call?.roomName || roomName,
        livekitUrl: res.livekitUrl,
        token: res.calleeToken,
        peerId: callerId,
        startedAt: res.call?.startedAt || startedAt,
        mode: res.call?.mode || mode,
        isGroup: Boolean(res.call?.conversationId),
        conversationId: res.call?.conversationId || undefined,
        hostId: res.call?.hostId || res.call?.callerId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Call may have already ended';
      toast({
        variant: 'destructive',
        title: 'Could not accept call',
        description: message,
      });
      ringtone.stop();
      reset();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setIsDeclining(true);
      ringtone.stop();
      await voiceApi.rejectCall(callId, 'reject');
    } catch {
      // Best-effort
    } finally {
      reset();
    }
  };

  const displayName = caller?.name || caller?.username || 'Incoming Caller';
  const initial = (displayName[0] || 'C').toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-card border shadow-2xl rounded-2xl p-6 text-center space-y-6 flex flex-col items-center">
        {/* Ringing pulse effect around avatar */}
        <div className="relative my-2">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping duration-1000 pointer-events-none" />
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg relative">
            <AvatarImage src={caller?.avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight">{displayName}</h3>
          <p className="text-xs text-muted-foreground">
            {caller?.username ? `@${caller.username}` : ''}
          </p>
          <p className="text-xs font-medium text-primary animate-pulse pt-1">
            Incoming {mode === 'video' ? 'video' : 'voice'} call... ({ringSeconds}s)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 pt-2 w-full">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="w-14 h-14 rounded-full shadow-md hover:scale-105 transition-transform"
              onClick={handleDecline}
              disabled={isDeclining || isAccepting}
              title="Decline call"
            >
              {isDeclining ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <PhoneOff className="w-6 h-6" />
              )}
            </Button>
            <span className="text-xs text-muted-foreground font-medium">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <Button
              type="button"
              variant="default"
              size="icon"
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:scale-105 transition-transform"
              onClick={handleAccept}
              disabled={isDeclining || isAccepting}
              title="Accept call"
            >
              {isAccepting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </Button>
            <span className="text-xs text-muted-foreground font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
