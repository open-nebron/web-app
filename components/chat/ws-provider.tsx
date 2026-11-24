'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WsClient, type WsStatus } from '@/lib/ws-client';
import { useAuthStore } from '@/lib/auth-store';
import { useChatStore } from '@/lib/chat-store';
import type { WSTypingPayload, WSPresencePayload, ChatMessage, ReactionSummary } from '@/lib/chat-types';

interface WsSendResult {
  payload?: {
    message?: ChatMessage;
    delivered?: boolean;
    conversationId?: string;
    clientId?: string;
  };
  [key: string]: unknown;
}

interface WsContextType {
  client: WsClient;
  status: WsStatus;
  sendMessage: (conversationId: string, body: string, clientId?: string) => Promise<WsSendResult>;
  sendRead: (conversationId: string, messageId: string) => Promise<unknown>;
  sendTyping: (conversationId: string, isTyping: boolean) => Promise<unknown>;
}

const WsContext = createContext<WsContextType | null>(null);

export function WsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const authStatus = useAuthStore((s) => s.status);
  const clientRef = useRef<WsClient | null>(null);

  const {
    wsStatus,
    setWsStatus,
    addTyping,
    clearTyping,
    pruneExpiredTyping,
    setPresence,
    starMessageId,
    unstarMessageId,
    setStarredMessageIds,
  } = useChatStore();

  if (!clientRef.current) {
    clientRef.current = new WsClient();
  }
  const client = clientRef.current;

  // Sync WS status and event handlers
  useEffect(() => {
    const unsubStatus = client.on('status', (status: WsStatus) => {
      setWsStatus(status);
    });

    const unsubTyping = client.on('typing.update', (data: any) => {
      const payload: WSTypingPayload = data?.payload ?? data;
      if (!payload?.conversationId || !payload?.userId) return;
      const isTyping = Boolean(payload.typing ?? payload.isTyping);
      if (isTyping) {
        addTyping(payload.conversationId, payload.userId);
      } else {
        clearTyping(payload.conversationId, payload.userId);
      }
    });

    const unsubPresence = client.on('presence.update', (data: any) => {
      const payload: WSPresencePayload = data?.payload ?? data;
      if (!payload?.userId) return;
      const isOnline = payload.online !== undefined
        ? payload.online
        : payload.status === 'online';
      setPresence(payload.userId, {
        status: isOnline ? 'online' : 'offline',
        lastSeenAt: payload.lastSeenAt,
      });
    });

    const unsubStarred = client.on('message.starred', (data: unknown) => {
      const raw = data as { payload?: import('@/lib/chat-types').WSMessageStarredPayload; messageId?: string };
      const payload = raw?.payload ?? raw;
      if (payload?.messageId) {
        starMessageId(payload.messageId);
      }
    });

    const unsubUnstarred = client.on('message.unstarred', (data: unknown) => {
      const raw = data as { payload?: import('@/lib/chat-types').WSMessageUnstarredPayload; messageId?: string };
      const payload = raw?.payload ?? raw;
      if (payload?.messageId) {
        unstarMessageId(payload.messageId);
      }
    });

    const unsubReactionAdded = client.on('reaction.added', (data: unknown) => {
      const raw = data as { payload?: import('@/lib/chat-types').WSReactionAddedPayload };
      const payload = raw?.payload ?? (data as import('@/lib/chat-types').WSReactionAddedPayload);
      if (payload?.conversationId && payload?.messageId && payload?.emoji) {
        queryClient.setQueriesData<{ pages: { data: ChatMessage[]; nextCursor?: string; hasMore?: boolean }[]; pageParams: unknown[] }>(
          { queryKey: ['messages', payload.conversationId] },
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: (page.data || []).map((m) => {
                  if (m.id !== payload.messageId) return m;
                  const currentReactions = m.reactions || [];
                  const existingIdx = currentReactions.findIndex((r) => r.emoji === payload.emoji);
                  let updatedReactions: ReactionSummary[];
                  if (existingIdx !== -1) {
                    const existing = currentReactions[existingIdx];
                    const hasUser = existing.userIds.includes(payload.userId);
                    const newUserIds = hasUser ? existing.userIds : [...existing.userIds, payload.userId];
                    const newCount = hasUser ? existing.count : existing.count + 1;
                    updatedReactions = currentReactions.map((r, idx) =>
                      idx === existingIdx ? { ...r, count: newCount, userIds: newUserIds } : r
                    );
                  } else {
                    updatedReactions = [
                      ...currentReactions,
                      { emoji: payload.emoji, count: 1, userIds: [payload.userId] },
                    ];
                  }
                  return { ...m, reactions: updatedReactions };
                }),
              })),
            };
          }
        );
      }
    });

    const unsubReactionRemoved = client.on('reaction.removed', (data: unknown) => {
      const raw = data as { payload?: import('@/lib/chat-types').WSReactionRemovedPayload };
      const payload = raw?.payload ?? (data as import('@/lib/chat-types').WSReactionRemovedPayload);
      if (payload?.conversationId && payload?.messageId && payload?.emoji) {
        queryClient.setQueriesData<{ pages: { data: ChatMessage[]; nextCursor?: string; hasMore?: boolean }[]; pageParams: unknown[] }>(
          { queryKey: ['messages', payload.conversationId] },
          (old) => {
            if (!old?.pages) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: (page.data || []).map((m) => {
                  if (m.id !== payload.messageId) return m;
                  const currentReactions = m.reactions || [];
                  const existingIdx = currentReactions.findIndex((r) => r.emoji === payload.emoji);
                  if (existingIdx === -1) return m;
                  const existing = currentReactions[existingIdx];
                  const hasUser = existing.userIds.includes(payload.userId);
                  if (!hasUser) return m;
                  const newUserIds = existing.userIds.filter((u) => u !== payload.userId);
                  const newCount = Math.max(0, existing.count - 1);
                  let updatedReactions: ReactionSummary[];
                  if (newCount === 0) {
                    updatedReactions = currentReactions.filter((_, idx) => idx !== existingIdx);
                  } else {
                    updatedReactions = currentReactions.map((r, idx) =>
                      idx === existingIdx ? { ...r, count: newCount, userIds: newUserIds } : r
                    );
                  }
                  return { ...m, reactions: updatedReactions };
                }),
              })),
            };
          }
        );
      }
    });

    return () => {
      unsubStatus();
      unsubTyping();
      unsubPresence();
      unsubStarred();
      unsubUnstarred();
      unsubReactionAdded();
      unsubReactionRemoved();
    };
  }, [client, queryClient, setWsStatus, addTyping, clearTyping, setPresence, starMessageId, unstarMessageId]);

  // Connect / disconnect on accessToken changes
  useEffect(() => {
    if (authStatus === 'authenticated' && accessToken) {
      client.connect(accessToken);
      // Fetch initial starred messages to populate starred cache
      import('@/lib/chat-api').then(({ chatApi }) => {
        chatApi.listStarred({ limit: 100 })
          .then((res) => {
            if (res?.data) {
              setStarredMessageIds(res.data.map((item) => item.messageId));
            }
          })
          .catch(() => {});
      });
    } else if (authStatus === 'unauthenticated') {
      client.disconnect();
    }
  }, [client, accessToken, authStatus, setStarredMessageIds]);

  // Prune expired typing users every second
  useEffect(() => {
    const interval = setInterval(() => {
      pruneExpiredTyping();
    }, 1000);
    return () => clearInterval(interval);
  }, [pruneExpiredTyping]);

  const value: WsContextType = {
    client,
    status: wsStatus,
    sendMessage: (convId, body, cId) => client.sendMessage(convId, body, cId),
    sendRead: (convId, msgId) => client.sendRead(convId, msgId),
    sendTyping: (convId, isTyping) => client.sendTyping(convId, isTyping),
  };

  return <WsContext.Provider value={value}>{children}</WsContext.Provider>;
}

export function useWsClient(): WsContextType {
  const ctx = useContext(WsContext);
  if (!ctx) {
    throw new Error('useWsClient must be used within a WsProvider');
  }
  return ctx;
}
