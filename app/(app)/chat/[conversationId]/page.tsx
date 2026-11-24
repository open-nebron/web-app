'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ConversationList } from '@/components/chat/conversation-list';
import { ConversationHeader } from '@/components/chat/conversation-header';
import { MessageList } from '@/components/chat/message-list';
import { TypingIndicator } from '@/components/chat/typing-indicator';
import { MessageComposer } from '@/components/chat/message-composer';
import { useConversations } from '@/hooks/use-conversations';
import { useMessages } from '@/hooks/use-messages';
import { useSendMessage } from '@/hooks/use-send-message';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/lib/chat-api';
import { useChatStore } from '@/lib/chat-store';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import type { ChatMessage, Conversation } from '@/lib/chat-types';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messageIdParam = searchParams?.get('messageId');
  const conversationId = params?.conversationId as string;
  const currentUserId = useAuthStore((s) => s.user?.userId || null);
  const { setActiveConversation } = useChatStore();
  const queryClient = useQueryClient();
  const [isAcceptedLocally, setIsAcceptedLocally] = React.useState(false);
  const [isActingOnRequest, setIsActingOnRequest] = React.useState(false);
  const hasScrolledToMessageRef = useRef<string | null>(null);

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['conversation-requests'],
    queryFn: () => chatApi.listRequests(),
    staleTime: 10 * 1000,
  });

  const pendingRequest = useMemo(
    () => pendingRequests.find((r) => r.id === conversationId),
    [pendingRequests, conversationId]
  );

  const { conversations, isLoading: isLoadingConvos } = useConversations();
  const {
    messages,
    isLoading: isLoadingMessages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    markAsRead,
    deleteMessage,
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

  // Fallback conversation object if not yet loaded in list or if pending request
  const activeConversation: Conversation = useMemo(() => {
    if (conversation) {
      return {
        ...conversation,
        peerUserId: conversation.peerUserId || pendingRequest?.senderId || pendingRequest?.peerUserId,
      };
    }
    if (pendingRequest) {
      return {
        ...pendingRequest,
        peerUserId: pendingRequest.senderId || pendingRequest.peerUserId,
      };
    }
    return {
      id: conversationId,
      kind: 'direct',
      unreadCount: 0,
      lastMessage: null,
      lastMessageAt: null,
    };
  }, [conversation, pendingRequest, conversationId]);

  const isPendingForMe = Boolean(
    (pendingRequest || (conversation && (conversation.requestState === 'pending' || conversation.request_state === 'pending') && conversation.peerUserId !== currentUserId && !conversation.isPending)) &&
    !isAcceptedLocally
  );

  const isDirect = activeConversation.kind === 'direct';
  const { data: relationship } = useQuery({
    queryKey: ['relationship', activeConversation.peerUserId],
    queryFn: () => chatApi.getRelationship(activeConversation.peerUserId!),
    enabled: Boolean(isDirect && activeConversation.peerUserId),
    staleTime: 60 * 1000,
  });
  const isPeerBlocked = isDirect && Boolean(relationship?.blocked);

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

  // Handle jump & flash to target message if messageId query param provided
  useEffect(() => {
    if (!messageIdParam || messages.length === 0) return;
    if (hasScrolledToMessageRef.current === messageIdParam) return;

    const el = document.getElementById(`message-${messageIdParam}`);
    if (el) {
      hasScrolledToMessageRef.current = messageIdParam;
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-amber-400/30', 'ring-2', 'ring-amber-400');
        setTimeout(() => {
          el.classList.remove('bg-amber-400/30', 'ring-2', 'ring-amber-400');
        }, 1500);
      }, 100);
    }
  }, [messageIdParam, messages]);

  // Handle retry
  const handleRetry = (msg: ChatMessage) => {
    if (msg.body) {
      sendMessage(msg.body);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      setIsActingOnRequest(true);
      await chatApi.acceptRequest(conversationId);
      setIsAcceptedLocally(true);
      await queryClient.invalidateQueries({ queryKey: ['conversation-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({
        title: 'Message request accepted',
        description: 'Conversation moved to your messages.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not accept request',
        description: err.message || 'Action failed',
      });
    } finally {
      setIsActingOnRequest(false);
    }
  };

  const handleDeclineRequest = async () => {
    try {
      setIsActingOnRequest(true);
      await chatApi.rejectRequest(conversationId);
      await queryClient.invalidateQueries({ queryKey: ['conversation-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast({
        title: 'Message request declined',
      });
      router.push('/chat/requests');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not decline request',
        description: err.message || 'Action failed',
      });
    } finally {
      setIsActingOnRequest(false);
    }
  };

  const handleBlockRequest = async () => {
    try {
      setIsActingOnRequest(true);
      const peerId = activeConversation.peerUserId;
      if (peerId) {
        await chatApi.blockUser(peerId);
      }
      await chatApi.rejectRequest(conversationId);
      await queryClient.invalidateQueries({ queryKey: ['conversation-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (peerId) {
        await queryClient.invalidateQueries({ queryKey: ['relationship', peerId] });
      }
      toast({
        title: 'User blocked',
        description: 'User blocked and request declined.',
      });
      router.push('/chat/requests');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not block user',
        description: err.message || 'Action failed',
      });
    } finally {
      setIsActingOnRequest(false);
    }
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

        {/* Message Request Banner */}
        {isPendingForMe && (
          <div className="bg-muted/80 border-b border-border/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-foreground truncate">
                Message request from {activeConversation.peerProfile?.name || activeConversation.peerProfile?.username || 'this user'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleBlockRequest}
                disabled={isActingOnRequest}
              >
                Block
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={handleDeclineRequest}
                disabled={isActingOnRequest}
              >
                Decline
              </Button>
              <Button
                size="sm"
                variant="default"
                className="text-xs h-8"
                onClick={handleAcceptRequest}
                disabled={isActingOnRequest}
              >
                {isActingOnRequest ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Accept
              </Button>
            </div>
          </div>
        )}

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
            onDelete={deleteMessage}
          />
        )}

        <TypingIndicator conversationId={conversationId} />

        <MessageComposer
          conversationId={conversationId}
          onSend={(text, replyToId) => sendMessage(text, replyToId)}
          disabled={isPeerBlocked || isPendingForMe}
          placeholder={isPendingForMe ? 'Accept this request to reply' : undefined}
        />
      </div>
    </div>
  );
}
