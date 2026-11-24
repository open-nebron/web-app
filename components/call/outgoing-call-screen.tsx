'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { useCallStore } from '@/lib/call-store';
import { voiceApi } from '@/lib/voice-api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PhoneOff, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface OutgoingCallScreenProps {
  callId: string;
  calleeId: string;
  roomName: string;
  startedAt: string;
  mode?: 'audio' | 'video';
}

export function OutgoingCallScreen({
  callId,
  calleeId,
  startedAt,
  mode = 'audio',
}: OutgoingCallScreenProps) {
  const { reset } = useCallStore();
  const { data: callee } = useUser(calleeId);
  const [isCancelling, setIsCancelling] = useState(false);
  const [ringingSeconds, setRingingSeconds] = useState(0);

  // 1s duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRingingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 45s auto-timeout matching backend call-timeout
  useEffect(() => {
    const timeout = setTimeout(async () => {
      toast({
        title: 'No answer',
        description: 'The call was not answered.',
      });
      try {
        await voiceApi.endCall(callId);
      } catch {
        // Ignore
      }
      reset();
    }, 45000);

    return () => clearTimeout(timeout);
  }, [callId, reset]);

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      await voiceApi.endCall(callId);
    } catch {
      // Best-effort
    } finally {
      reset();
    }
  };

  const displayName = callee?.name || callee?.username || 'Calling...';
  const initial = (displayName[0] || 'C').toUpperCase();

  const formattedTime = `${Math.floor(ringingSeconds / 60)}:${(ringingSeconds % 60)
    .toString()
    .padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-card border shadow-2xl rounded-2xl p-6 text-center space-y-6 flex flex-col items-center">
        {/* Pulsing avatar */}
        <div className="relative my-2">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping duration-1000 pointer-events-none" />
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg relative">
            <AvatarImage src={callee?.avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight">{displayName}</h3>
          <p className="text-xs text-muted-foreground">
            {callee?.username ? `@${callee.username}` : ''}
          </p>
          <p className="text-xs font-medium text-muted-foreground animate-pulse pt-1">
            Calling ({mode === 'video' ? 'video' : 'voice'})... ({formattedTime})
          </p>
        </div>

        {/* Cancel Button */}
        <div className="pt-2">
          <div className="flex flex-col items-center gap-1.5">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="w-14 h-14 rounded-full shadow-md hover:scale-105 transition-transform"
              onClick={handleCancel}
              disabled={isCancelling}
              title="Cancel call"
            >
              {isCancelling ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <PhoneOff className="w-6 h-6" />
              )}
            </Button>
            <span className="text-xs text-muted-foreground font-medium">Cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
