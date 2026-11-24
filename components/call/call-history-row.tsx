'use client';

import React from 'react';
import { format } from 'date-fns';
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

  let formattedDate = '';
  try {
    formattedDate = format(new Date(call.startedAt), 'MMM d, h:mm a');
  } catch {
    formattedDate = call.startedAt;
  }

  // Duration
  let durationStr = '0s';
  if (call.durationSeconds !== undefined && call.durationSeconds !== null) {
    const mins = Math.floor(call.durationSeconds / 60);
    const secs = call.durationSeconds % 60;
    durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }

  // Status icon & badge
  let statusIcon = isOutgoing ? (
    <PhoneOutgoing className="w-3.5 h-3.5 text-muted-foreground" />
  ) : (
    <PhoneIncoming className="w-3.5 h-3.5 text-muted-foreground" />
  );

  let statusBadge = (
    <Badge variant="outline" className="text-[11px] font-normal">
      {call.state}
    </Badge>
  );

  if (call.state === 'accepted') {
    statusBadge = (
      <Badge variant="secondary" className="text-[11px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
        Connected
      </Badge>
    );
  } else if (call.state === 'missed') {
    statusIcon = <PhoneMissed className="w-3.5 h-3.5 text-destructive" />;
    statusBadge = (
      <Badge variant="destructive" className="text-[11px]">
        Missed
      </Badge>
    );
  } else if (call.state === 'rejected') {
    statusIcon = <PhoneOff className="w-3.5 h-3.5 text-destructive" />;
    statusBadge = (
      <Badge variant="outline" className="text-[11px] text-destructive border-destructive/20">
        Declined
      </Badge>
    );
  } else if (call.state === 'timed_out') {
    statusIcon = <PhoneMissed className="w-3.5 h-3.5 text-amber-500" />;
    statusBadge = (
      <Badge variant="outline" className="text-[11px] text-amber-500 border-amber-500/20">
        No Answer
      </Badge>
    );
  }

  return (
    <div className="flex items-center justify-between p-3.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-10 h-10 border">
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
            <span>{formattedDate}</span>
            {call.state === 'accepted' && (
              <>
                <span>•</span>
                <span>{durationStr}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <CallButton peerUserId={peerId} />
      </div>
    </div>
  );
}
