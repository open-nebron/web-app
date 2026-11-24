'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Loader2 } from 'lucide-react';
import { useCallStore } from '@/lib/call-store';
import { useWsStatus } from '@/hooks/use-ws';
import { usePresence } from '@/hooks/use-presence';
import { voiceApi } from '@/lib/voice-api';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface CallButtonProps {
  peerUserId: string;
  className?: string;
}

export function CallButton({ peerUserId, className }: CallButtonProps) {
  const [isStarting, setIsStarting] = useState(false);
  const callState = useCallStore((s) => s.state);
  const setState = useCallStore((s) => s.setState);
  const wsStatus = useWsStatus();
  const presence = usePresence(peerUserId);

  // If already in a call, hide button
  if (callState.kind !== 'idle') {
    return null;
  }

  const isWsConnected = wsStatus === 'connected';
  const isOffline = presence.status === 'offline';

  let tooltipTitle = 'Start voice call';
  if (!isWsConnected) {
    tooltipTitle = 'Chat disconnected';
  } else if (isOffline) {
    tooltipTitle = 'User is offline';
  }

  const handleCall = async () => {
    if (!peerUserId || isStarting) return;

    if (!isWsConnected) {
      toast({
        variant: 'destructive',
        title: 'Connection offline',
        description: 'Cannot start a call while disconnected from real-time services.',
      });
      return;
    }

    try {
      setIsStarting(true);
      const res = await voiceApi.startCall(peerUserId);
      setState({
        kind: 'outgoing',
        callId: res.call.id,
        calleeId: peerUserId,
        roomName: res.call.roomName,
        startedAt: res.call.startedAt || new Date().toISOString(),
      });
    } catch (err: any) {
      const status = err.status;
      if (status === 409) {
        toast({
          variant: 'destructive',
          title: 'Already in a call',
          description: 'You or the other user are already in an active call.',
        });
      } else if (status === 403) {
        toast({
          variant: 'destructive',
          title: 'Cannot place call',
          description: err.message || 'Call was declined by relationship settings.',
        });
      } else if (status === 503) {
        toast({
          variant: 'destructive',
          title: 'Voice service unavailable',
          description: 'Voice service is temporarily unavailable. Please try again later.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Could not start call',
          description: err.message || 'Failed to initiate voice call.',
        });
      }
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors',
        className
      )}
      onClick={handleCall}
      disabled={isStarting || !isWsConnected}
      title={tooltipTitle}
      aria-label="Start voice call"
    >
      {isStarting ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      ) : (
        <Phone className="w-4 h-4" />
      )}
    </Button>
  );
}
