'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useChatStore } from '@/lib/chat-store';
import { useAuthStore } from '@/lib/auth-store';

interface ChatContextType {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  currentUserId: string | null;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({
  children,
  activeConversationId: initialActiveId = null,
}: {
  children: React.ReactNode;
  activeConversationId?: string | null;
}) {
  const currentUserId = useAuthStore((s) => s.user?.userId || null);
  const { activeConversationId, setActiveConversation } = useChatStore();

  useEffect(() => {
    if (initialActiveId !== undefined) {
      setActiveConversation(initialActiveId);
    }
  }, [initialActiveId, setActiveConversation]);

  return (
    <ChatContext.Provider
      value={{
        activeConversationId,
        setActiveConversationId: setActiveConversation,
        currentUserId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return ctx;
}
