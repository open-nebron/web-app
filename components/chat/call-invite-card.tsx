'use client';

import React, { useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { useCallStore } from '@/lib/call-store';
import { voiceApi } from '@/lib/voice-api';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Phone, Video, Loader2, PhoneOff, Users } from 'lucide-react';
import type { ChatMessage } from '@/lib/chat-types';
import type { CallInviteBody } from '@/lib/call-types';
import { cn } from '@/lib/utils';

interface CallInviteCardProps {
  message: ChatMessage;
}

export function CallInviteCard({ message }: CallInviteCardProps) {
  const [isJoining, setIsJoining] = useState(false);
  const currentCallState = useCallStore((s) => s.state);

  let inviteData: CallInviteBody | null = null;
  try {
    inviteData = JSON.parse(message.body);
  } catch {
    inviteData = null;
  }

  const hostId = inviteData?.hostId || message.senderId;
  const { data: hostUser } = useUser(hostId);
  const hostName = hostUser?.name || hostUser?.username || 'Member';

  if (!inviteData) {
    return (
      <div className="p-3 text-sm text-muted-foreground italic rounded-xl border bg-muted/30">
        Call invite
      </div>
    );
  }

  const mode = inviteData.mode || 'audio';
  const isEnded = Boolean(inviteData.endedAt);
  const isVideo = mode === 'video';

  const isCurrentlyInThisCall =
    (currentCallState.kind === 'active' ||
      currentCallState.kind === 'connecting' ||
      currentCallState.kind === 'reconnecting') &&
    currentCallState.callId === inviteData.callId;

  const handleJoin = async () => {
    if (!inviteData || isEnded || isCurrentlyInThisCall) return;
    setIsJoining(true);
    try {
      const res = await voiceApi.joinGroupCall(inviteData.callId);
      useCallStore.getState().setState({
        kind: 'connecting',
        callId: inviteData.callId,
        roomName: res.roomName,
        livekitUrl: res.livekitUrl,
        token: res.token,
        peerId: inviteData.hostId,
        startedAt: inviteData.startedAt,
        mode: inviteData.mode,
        isGroup: true,
        conversationId: message.conversationId,
        hostId: inviteData.hostId,
      });
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      toast({
        variant: 'destructive',
        title: 'Could not join call',
        description: errorObj.message || 'The call may have ended or reached capacity.',
      });
    } finally {
      setIsJoining(false);
    }
  };

  // Compute duration if ended
  let durationText = '';
  if (isEnded && inviteData.startedAt && inviteData.endedAt) {
    const diffSeconds = Math.max(
      0,
      Math.floor(
        (new Date(inviteData.endedAt).getTime() - new Date(inviteData.startedAt).getTime()) / 1000
      )
    );
    const mins = Math.floor(diffSeconds / 60);
    const secs = diffSeconds % 60;
    durationText = `${mins}m ${secs}s`;
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm w-full max-w-sm space-y-3.5 my-1 text-card-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner',
              isEnded
                ? 'bg-muted text-muted-foreground'
                : isVideo
                  ? 'bg-blue-500/15 text-blue-500'
                  : 'bg-emerald-500/15 text-emerald-500'
            )}
          >
            {isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold truncate leading-tight">
              {isVideo ? 'Group Video Call' : 'Group Voice Call'}
            </h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              Started by {hostName}
            </p>
          </div>
        </div>

        {/* Live or Ended badge */}
        <div>
          {isEnded ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">
              <PhoneOff className="w-3 h-3" />
              Ended
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Action or stats */}
      {!isEnded ? (
        <div className="pt-1">
          {isCurrentlyInThisCall ? (
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              You are in this call
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              className="w-full h-9 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm"
              onClick={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining...</span>
                </>
              ) : (
                <>
                  {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  <span>Join Call</span>
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div className="pt-0.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
          <span>{inviteData.endReason === 'host_ended' ? 'Ended by host' : 'Call ended'}</span>
          {durationText && <span>Duration: {durationText}</span>}
        </div>
      )}
    </div>
  );
}
