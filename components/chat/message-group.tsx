'use client';

import React from 'react';
import type { ChatMessage } from '@/lib/chat-types';
import { MessageRow } from './message-row';

interface MessageGroupProps {
  messages: ChatMessage[];
  isSelf: boolean;
  isGroupChat?: boolean;
  canDeleteAny?: boolean;
  hideReadReceipts?: boolean;
  onRetry?: (message: ChatMessage) => void;
  onDelete?: (messageId: string) => Promise<void> | void;
}

export function MessageGroup({
  messages,
  isSelf,
  isGroupChat = false,
  canDeleteAny = false,
  hideReadReceipts = false,
  onRetry,
  onDelete,
}: MessageGroupProps) {
  if (messages.length === 0) return null;

  return (
    <div className="space-y-0.5 my-1.5">
      {messages.map((message, index) => {
        // Show sender name on the very first message of the group
        const showSenderName = isGroupChat && !isSelf && index === 0;
        // Show avatar on the last message of the group
        const showAvatar = index === messages.length - 1;

        return (
          <MessageRow
            key={message.id || message.clientId || index}
            message={message}
            isSelf={isSelf}
            showAvatar={showAvatar}
            showSenderName={showSenderName}
            canDeleteAny={canDeleteAny}
            hideReadReceipts={hideReadReceipts}
            onRetry={onRetry}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
}
