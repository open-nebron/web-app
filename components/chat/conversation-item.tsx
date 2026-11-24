'use client';

import React from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import type { Conversation } from '@/lib/chat-types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PresenceDot } from './presence-dot';
import { useUser } from '@/hooks/use-user';
import { usePresence } from '@/hooks/use-presence';
import { Users, BellOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/chat-api';
import { cn } from '@/lib/utils';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
}: ConversationItemProps) {
  const isDirect = conversation.kind === 'direct';
  const { data: peerUser } = useUser(isDirect ? conversation.peerUserId : undefined);
  const presence = usePresence(isDirect ? conversation.peerUserId : undefined);

  // Determine display title
  const title = isDirect
    ? peerUser?.name || peerUser?.username || 'User'
    : conversation.name || 'Group Chat';

  const avatarUrl = isDirect ? peerUser?.avatarUrl : undefined;
  const initial = (title[0] || 'C').toUpperCase();

  const { data: relationship } = useQuery({
    queryKey: ['relationship', conversation.peerUserId],
    queryFn: () => chatApi.getRelationship(conversation.peerUserId!),
    enabled: Boolean(isDirect && conversation.peerUserId),
    staleTime: 60 * 1000,
  });

  const isMuted = Boolean(relationship?.muted?.messages || relationship?.muted?.calls);

  // Format timestamp of last message
  let formattedTime = '';
  if (conversation.lastMessageAt) {
    const d = new Date(conversation.lastMessageAt);
    if (isToday(d)) {
      formattedTime = format(d, 'h:mm a');
    } else if (isYesterday(d)) {
      formattedTime = 'Yesterday';
    } else {
      formattedTime = format(d, 'MMM d');
    }
  }

  // Format last message preview
  const lastMsgSnippet = conversation.lastMessage
    ? conversation.lastMessage.body
    : 'No messages yet';

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 px-3.5 py-3 rounded-lg cursor-pointer transition-colors relative select-none',
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'hover:bg-muted/60 text-foreground'
      )}
    >
      {/* Avatar with Presence dot */}
      <div className="relative shrink-0">
        <Avatar className="w-12 h-12 border border-border/40">
          <AvatarImage src={avatarUrl || undefined} alt={title} />
          <AvatarFallback className={cn('text-sm font-semibold', !isDirect && 'bg-primary/10 text-primary')}>
            {isDirect ? initial : <Users className="w-5 h-5" />}
          </AvatarFallback>
        </Avatar>

        {isDirect && (
          <div className="absolute bottom-0 right-0">
            <PresenceDot status={presence.status} size="md" />
          </div>
        )}
      </div>

      {/* Info column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="text-sm font-semibold truncate leading-tight">{title}</h4>
            {isMuted && (
              <BellOff className="w-3 h-3 text-muted-foreground/60 shrink-0" aria-label="Muted" />
            )}
          </div>
          {formattedTime && (
            <span className="text-[11px] text-muted-foreground shrink-0 font-normal">
              {formattedTime}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'text-xs truncate text-muted-foreground leading-normal',
              conversation.unreadCount > 0 && 'font-medium text-foreground'
            )}
          >
            {lastMsgSnippet}
          </p>

          {conversation.unreadCount > 0 && (
            <Badge
              variant="default"
              className="h-4 min-w-4 px-1.5 py-0 text-[10px] rounded-full shrink-0 flex items-center justify-center font-bold"
            >
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
