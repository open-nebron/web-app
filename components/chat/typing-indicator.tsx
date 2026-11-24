'use client';

import React from 'react';
import { useTyping } from '@/hooks/use-typing';
import { useUser } from '@/hooks/use-user';

interface TypingIndicatorProps {
  conversationId: string;
}

function TypingUserName({ userId }: { userId: string }) {
  const { data: user } = useUser(userId);
  return <span>{user?.name || user?.username || 'Someone'}</span>;
}

export function TypingIndicator({ conversationId }: TypingIndicatorProps) {
  const typingUsers = useTyping(conversationId);

  if (!typingUsers || typingUsers.length === 0) {
    return <div className="h-6" aria-hidden="true" />; // preserve height to prevent jitter
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground animate-in fade-in-50 duration-200">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" />
      </div>
      <span>
        {typingUsers.length === 1 ? (
          <>
            <TypingUserName userId={typingUsers[0].userId} /> is typing...
          </>
        ) : typingUsers.length === 2 ? (
          <>
            <TypingUserName userId={typingUsers[0].userId} /> and{' '}
            <TypingUserName userId={typingUsers[1].userId} /> are typing...
          </>
        ) : (
          'Several people are typing...'
        )}
      </span>
    </div>
  );
}
