'use client';

import React from 'react';
import { format } from 'date-fns';
import type { ChatMessage } from '@/lib/chat-types';
import { MessageStatusIcon } from './message-status';
import { UserPopover } from '@/components/users/user-popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

interface MessageRowProps {
  message: ChatMessage;
  isSelf: boolean;
  showAvatar?: boolean;
  showSenderName?: boolean;
  onRetry?: (message: ChatMessage) => void;
}

export function MessageRow({
  message,
  isSelf,
  showAvatar = true,
  showSenderName = false,
  onRetry,
}: MessageRowProps) {
  const { data: sender } = useUser(!isSelf ? message.senderId : undefined);
  const time = message.createdAt ? format(new Date(message.createdAt), 'h:mm a') : '';
  const senderName = sender?.name || sender?.username || 'User';

  return (
    <div
      className={cn(
        'group flex gap-2.5 px-4 py-0.5 items-end max-w-full',
        isSelf ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Incoming message avatar */}
      {!isSelf && (
        <div className="w-8 shrink-0">
          {showAvatar ? (
            <UserPopover userId={message.senderId}>
              <Avatar className="w-8 h-8 cursor-pointer hover:opacity-85 transition-opacity">
                <AvatarImage src={sender?.avatarUrl || undefined} />
                <AvatarFallback className="text-[11px] font-semibold">
                  {(senderName[0] || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </UserPopover>
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      {/* Message content + meta */}
      <div
        className={cn(
          'flex flex-col max-w-[75%] sm:max-w-[65%]',
          isSelf ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender name for group chats */}
        {!isSelf && showSenderName && (
          <UserPopover userId={message.senderId}>
            <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1 cursor-pointer hover:underline">
              {senderName}
            </span>
          </UserPopover>
        )}

        <div
          className={cn(
            'relative px-3.5 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap leading-relaxed shadow-sm',
            isSelf
              ? 'bg-primary text-primary-foreground rounded-br-xs'
              : 'bg-muted text-foreground rounded-bl-xs'
          )}
        >
          {message.body}

          {/* Timestamp & Status footer */}
          <div
            className={cn(
              'flex items-center gap-1 justify-end mt-1 text-[10px] select-none',
              isSelf ? 'text-primary-foreground/75' : 'text-muted-foreground'
            )}
          >
            <span>{time}</span>
            {isSelf && <MessageStatusIcon status={message.status} />}
          </div>
        </div>

        {/* Retry button for failed messages */}
        {message.status === 'failed' && onRetry && (
          <button
            onClick={() => onRetry(message)}
            className="flex items-center gap-1 text-[11px] text-destructive hover:underline mt-1 mr-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Failed. Tap to retry</span>
          </button>
        )}
      </div>
    </div>
  );
}
