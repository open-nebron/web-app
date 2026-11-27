'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWsClient } from '@/hooks/use-ws';
import { chatApi, isValidConversationId } from '@/lib/chat-api';
import { useAuthStore } from '@/lib/auth-store';
import type { ChatMessage, Conversation } from '@/lib/chat-types';

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const { sendMessage: wsSendMessage, status: wsStatus } = useWsClient();
  const user = useAuthStore((s) => s.user);

  const sendMessage = useCallback(
    async (
      body: string,
      replyToId?: string,
      forwardOf?: { messageId: string; conversationId: string; senderId?: string }
    ) => {
      if (!isValidConversationId(conversationId) || (!body.trim() && !forwardOf) || !user) return;

      const trimmedBody = body.trim();
      const clientId = 'c-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
      const tempId = 'temp-' + clientId;
      const nowIso = new Date().toISOString();

      const optimisticMessage: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: user.userId,
        body: trimmedBody,
        createdAt: nowIso,
        editedAt: null,
        deleted: false,
        status: 'sending',
        clientId,
        replyToId: replyToId || null,
        forwardedFrom: forwardOf
          ? {
              senderId: forwardOf.senderId || user.userId,
              messageId: forwardOf.messageId,
              conversationId: forwardOf.conversationId,
            }
          : null,
      };

      const messagesKey = ['messages', conversationId];

      // 1. Optimistically append message to the messages query cache
      queryClient.setQueryData<any>(messagesKey, (old: any) => {
        if (!old || !old.pages || old.pages.length === 0) {
          return {
            pages: [{ data: [optimisticMessage], hasMore: false }],
            pageParams: [undefined],
          };
        }
        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [
            { ...firstPage, data: [optimisticMessage, ...(firstPage.data || [])] },
            ...old.pages.slice(1),
          ],
        };
      });

      // 2. Optimistically update lastMessage in conversations list
      queryClient.setQueriesData<Conversation[]>(
        { queryKey: ['conversations'] },
        (old) => {
          if (!old) return old;
          const idx = old.findIndex((c) => c.id === conversationId);
          if (idx === -1) return old;
          const updated: Conversation = {
            ...old[idx],
            lastMessage: {
              id: tempId,
              body: trimmedBody,
              senderId: user.userId,
              createdAt: nowIso,
            },
            lastMessageAt: nowIso,
          };
          return [updated, ...old.filter((_, i) => i !== idx)];
        }
      );

      // 3. Send via WebSocket (or HTTP fallback)
      try {
        let confirmedMessage: ChatMessage | null = null;

        if (wsStatus === 'connected') {
          const res = await wsSendMessage(conversationId, trimmedBody, clientId, replyToId, forwardOf);
          confirmedMessage = res?.payload?.message ?? null;
        } else {
          const res = await chatApi.sendMessageHttp(conversationId, trimmedBody, clientId, replyToId, forwardOf);
          confirmedMessage = res?.message ?? null;
        }

        // 4. Update optimistic message to confirmed status
        queryClient.setQueryData<any>(messagesKey, (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              data: (p.data || []).map((m: ChatMessage) => {
                if (m.clientId === clientId || m.id === tempId) {
                  return {
                    ...m,
                    id: confirmedMessage?.id || m.id,
                    createdAt: confirmedMessage?.createdAt || m.createdAt,
                    status: 'sent' as const,
                  };
                }
                return m;
              }),
            })),
          };
        });
      } catch (err) {
        console.error('[useSendMessage] Failed to send message:', err);
        // Mark optimistic message as failed
        queryClient.setQueryData<any>(messagesKey, (old: any) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p: any) => ({
              ...p,
              data: (p.data || []).map((m: ChatMessage) => {
                if (m.clientId === clientId || m.id === tempId) {
                  return { ...m, status: 'failed' as const };
                }
                return m;
              }),
            })),
          };
        });
      }
    },
    [conversationId, user, wsStatus, wsSendMessage, queryClient]
  );

  return { sendMessage };
}
