'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ConversationList } from '@/components/chat/conversation-list';
import { ConversationHeader } from '@/components/chat/conversation-header';
import { MessageList } from '@/components/chat/message-list';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { MessageComposer } from '@/components/chat/message-composer';
import { useConversations } from '@/hooks/use-conversations';
import { useMessages } from '@/hooks/use-messages';
import { useSendMessage } from '@/hooks/use-send-message';
import { useAuthStore } from '@/lib/auth-store';
import { useChatStore } from '@/lib/chat-store';
import { Loader2 } from 'lucide-react';
import type { ChatMessage, Conversation } from '@/lib/chat-types';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.conversationId as string;
  const currentUserId = useAuthStore((s) => s.user?.userId || null);
  const { setActiveConversation } = useChatStore();

  const { conversations, isLoading: isLoadingConvos } = useConversations();
  const {
    messages,
    isLoading: isLoadingMessages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    markAsRead,
  } = useMessages(conversationId);

  const { sendMessage } = useSendMessage(conversationId);

  // Set active conversation in store
  useEffect(() => {
    setActiveConversation(conversationId);
    return () => {
      setActiveConversation(null);
    };
  }, [conversationId, setActiveConversation]);

  // Find conversation object
  const conversation: Conversation | undefined = useMemo(() => {
    return conversations.find((c) => c.id === conversationId);
  }, [conversations, conversationId]);

  // Track the latest message ID that was already marked as read
  const lastMarkedReadIdRef = useRef<string | null>(null);

  useEffect(() => {
    lastMarkedReadIdRef.current = null;
  }, [conversationId]);

  // Mark read when entering conversation or when new peer messages arrive
  useEffect(() => {
    if (messages.length === 0) return;
    // Find the latest message sent by another user that needs reading
    const latestPeerMsg = [...messages].reverse().find((m) => m.senderId !== currentUserId);
    if (!latestPeerMsg?.id) return;

    if (lastMarkedReadIdRef.current === latestPeerMsg.id) {
      return;
    }

    lastMarkedReadIdRef.current = latestPeerMsg.id;
    markAsRead(latestPeerMsg.id);
  }, [conversationId, messages, currentUserId, markAsRead]);

  // Handle retry
  const handleRetry = (msg: ChatMessage) => {
    if (msg.body) {
      sendMessage(msg.body);
    }
  };

  // Fallback conversation object if not yet loaded in list
  const activeConversation: Conversation = conversation || {
    id: conversationId,
    kind: 'direct',
    unreadCount: 0,
    lastMessage: null,
    lastMessageAt: null,
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Conversation Sidebar */}
      <div className="hidden md:block w-80 lg:w-96 shrink-0 h-full border-r">
        <ConversationList activeId={conversationId} />
      </div>

      {/* Main Chat Thread */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background">
        <ConversationHeader conversation={activeConversation} />

        {isLoadingMessages && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            isGroupChat={activeConversation.kind === 'group'}
            isLoadingMore={isFetchingNextPage}
            hasMore={Boolean(hasNextPage)}
            onLoadMore={() => fetchNextPage()}
            onRetry={handleRetry}
            onMarkRead={(msgId) => markAsRead(msgId)}
          />
        )}

        <TypingIndicator conversationId={conversationId} />

        <MessageComposer
          conversationId={conversationId}
          onSend={(text) => sendMessage(text)}
        />
      </div>
    </div>
  );
}
