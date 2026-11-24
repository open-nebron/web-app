'use client';

import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useUser } from '@/hooks/use-user';
import { CallButton } from './call-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff } from 'lucide-react';
import type { CallRecord } from '@/lib/call-types';

interface CallHistoryRowProps {
  call: CallRecord;
  currentUserId: string;
}

export function CallHistoryRow({ call, currentUserId }: CallHistoryRowProps) {
  const isOutgoing = call.callerId === currentUserId;
  const peerId = isOutgoing ? call.calleeId : call.callerId;
  const { data: peerUser } = useUser(peerId);

  const displayName = peerUser?.name || peerUser?.username || 'User';
  const initial = (displayName[0] || 'U').toUpperCase();

  let relativeTime = '';
  let exactTime = '';
  try {
    const d = new Date(call.startedAt);
    relativeTime = formatDistanceToNow(d, { addSuffix: true });
    exactTime = format(d, 'h:mm a');
  } catch {
    relativeTime = call.startedAt;
  }

  // Duration calculation
  const wasAccepted = Boolean(call.acceptedAt || call.state === 'accepted' || (call.durationSeconds && call.durationSeconds > 0));
  let durationSeconds = 0;
  if (call.endedAt && call.acceptedAt) {
    durationSeconds = Math.max(
      0,
      Math.round((new Date(call.endedAt).getTime() - new Date(call.acceptedAt).getTime()) / 1000)
    );
  } else if (call.durationSeconds) {
    durationSeconds = call.durationSeconds;
  }

  let durationStr = '0s';
  if (durationSeconds > 0) {
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  // Determine status & icon
  let statusBadge: React.ReactNode;
  let statusIcon: React.ReactNode;

  if (wasAccepted) {
    statusIcon = isOutgoing ? (
      <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />
    ) : (
      <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
    );
    statusBadge = (
      <Badge variant="secondary" className="text-[11px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
        {durationStr}
      </Badge>
    );
  } else if (call.state === 'rejected' || call.endReason === 'declined' || call.endReason === 'rejected') {
    statusIcon = <PhoneOff className="w-3.5 h-3.5 text-destructive" />;
    statusBadge = (
      <Badge variant="outline" className="text-[11px] text-destructive border-destructive/20">
        Declined
      </Badge>
    );
  } else if (call.state === 'missed' || call.endReason === 'missed') {
    statusIcon = <PhoneMissed className="w-3.5 h-3.5 text-destructive" />;
    statusBadge = (
      <Badge variant="destructive" className="text-[11px]">
        Missed
      </Badge>
    );
  } else if (call.state === 'timed_out' || call.endReason === 'timed_out') {
    statusIcon = <PhoneMissed className="w-3.5 h-3.5 text-amber-500" />;
    statusBadge = (
      <Badge variant="outline" className="text-[11px] text-amber-500 border-amber-500/20">
        No Answer
      </Badge>
    );
  } else if (call.endReason === 'cancelled' || isOutgoing) {
    statusIcon = <PhoneOutgoing className="w-3.5 h-3.5 text-muted-foreground" />;
    statusBadge = (
      <Badge variant="outline" className="text-[11px] text-muted-foreground">
        Cancelled
      </Badge>
    );
  } else {
    statusIcon = <PhoneMissed className="w-3.5 h-3.5 text-destructive" />;
    statusBadge = (
      <Badge variant="destructive" className="text-[11px]">
        Missed
      </Badge>
    );
  }

  return (
    <div className="flex items-center justify-between p-3.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10 border shrink-0">
          <AvatarImage src={peerUser?.avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="font-semibold text-xs">{initial}</AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm truncate leading-none">{displayName}</h4>
            {statusBadge}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            {statusIcon}
            <span>{isOutgoing ? 'Outgoing' : 'Incoming'}</span>
            <span>•</span>
            <span title={exactTime}>{relativeTime}</span>
            {exactTime && <span className="hidden sm:inline text-muted-foreground/60">({exactTime})</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <CallButton peerUserId={peerId} />
      </div>
    </div>
  );
}
