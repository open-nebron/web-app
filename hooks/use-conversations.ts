'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, type ListConversationsParams } from '@/lib/chat-api';
import type { Conversation, WSMessageNewPayload, WSMessageReadPayload } from '@/lib/chat-types';
import { useWsEvent } from '@/hooks/use-ws';
import { useChatStore } from '@/lib/chat-store';
import { useAuthStore } from '@/lib/auth-store';

export function useConversations(params: ListConversationsParams = {}) {
  const queryClient = useQueryClient();
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const currentUserId = useAuthStore((s) => s.user?.userId);

  const queryKey = ['conversations', params.kind || 'all'];

  const query = useQuery<Conversation[]>({
    queryKey,
    queryFn: async () => {
      return chatApi.listConversations(params);
    },
    staleTime: 30 * 1000,
  });

  // Handle incoming new messages to update conversation preview and order
  useWsEvent('message.new', (payload: WSMessageNewPayload) => {
    if (!payload?.message) return;
    const { conversationId, body, id, senderId, createdAt } = payload.message;

    queryClient.setQueriesData<Conversation[]>(
      { queryKey: ['conversations'] },
      (old) => {
        if (!old) return old;

        const existingIndex = old.findIndex((c) => c.id === conversationId);
        const isActive = activeConversationId === conversationId;
        const isFromSelf = senderId === currentUserId;

        if (existingIndex !== -1) {
          const existing = old[existingIndex];
          const unreadCount = isActive || isFromSelf ? existing.unreadCount : (existing.unreadCount || 0) + 1;

          const updated: Conversation = {
            ...existing,
            lastMessage: {
              id,
              body,
              senderId,
              createdAt,
            },
            lastMessageAt: createdAt,
            unreadCount,
          };

          const rest = old.filter((_, idx) => idx !== existingIndex);
          return [updated, ...rest];
        } else {
          // If conversation isn't in list yet, invalidate to fetch it
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          return old;
        }
      }
    );
  });

  // Handle read receipts to clear unread badges
  useWsEvent('message.read', (payload: WSMessageReadPayload) => {
    if (!payload?.conversationId) return;
    const { conversationId, userId } = payload;

    // If we are the one who marked it as read, clear unreadCount
    if (userId === currentUserId) {
      queryClient.setQueriesData<Conversation[]>(
        { queryKey: ['conversations'] },
        (old) => {
          if (!old) return old;
          return old.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          );
        }
      );
    }
  });

  // Mutations
  const createDirectMutation = useMutation({
    mutationFn: (peerUserId: string) => chatApi.createDirect(peerUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: ({ name, memberIds }: { name: string; memberIds: string[] }) =>
      chatApi.createGroup(name, memberIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  return {
    ...query,
    conversations: query.data || [],
    createDirect: createDirectMutation.mutateAsync,
    createGroup: createGroupMutation.mutateAsync,
    isCreatingDirect: createDirectMutation.isPending,
    isCreatingGroup: createGroupMutation.isPending,
  };
}
