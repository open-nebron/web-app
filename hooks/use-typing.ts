'use client';

import { useCallback, useRef } from 'react';
import { useChatStore } from '@/lib/chat-store';
import { useAuthStore } from '@/lib/auth-store';
import { useWsClient } from '@/components/chat/ws-provider';

export function useTyping(conversationId: string) {
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const typingUsers = useChatStore(
    (s) => s.typingByConversation[conversationId] || []
  );

  // Filter out self
  return typingUsers.filter((u) => u.userId !== currentUserId);
}

export function useStartTyping(conversationId: string) {
  const { sendTyping } = useWsClient();
  const lastSentRef = useRef<number>(0);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reportTyping = useCallback(() => {
    if (!conversationId) return;

    const now = Date.now();
    // Debounce typing.start to at most once per 3s
    if (now - lastSentRef.current > 3000) {
      lastSentRef.current = now;
      sendTyping(conversationId, true).catch(() => {});
    }

    // Reset auto-stop timer: if no typing for 2.5s, send typing.stop
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
    }

    stopTimeoutRef.current = setTimeout(() => {
      lastSentRef.current = 0;
      sendTyping(conversationId, false).catch(() => {});
    }, 2500);
  }, [conversationId, sendTyping]);

  const stopTypingImmediately = useCallback(() => {
    if (!conversationId) return;
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    lastSentRef.current = 0;
    sendTyping(conversationId, false).catch(() => {});
  }, [conversationId, sendTyping]);

  return { reportTyping, stopTypingImmediately };
}
