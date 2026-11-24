'use client';

import { useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '@/lib/chat-api';
import type { ChatMessage, Conversation, WSMessageNewPayload, WSMessageReadPayload } from '@/lib/chat-types';
import { useWsEvent, useWsClient } from '@/hooks/use-ws';
import { useAuthStore } from '@/lib/auth-store';

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const { sendRead, status } = useWsClient();

  const queryKey = useMemo(() => ['messages', conversationId], [conversationId]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      return chatApi.listMessages(conversationId, {
        before: pageParam as string | undefined,
        limit: 30,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.data.length === 0) {
        return undefined;
      }
      return lastPage.data[lastPage.data.length - 1].id;
    },
    enabled: Boolean(conversationId),
    staleTime: 10 * 1000,
  });

  // Flatten and order messages chronologically (oldest -> newest)
  const messages = useMemo(() => {
    if (!query.data?.pages) return [];

    // All pages from newest to oldest. Each page's items are newest-to-oldest.
    const allItems: ChatMessage[] = [];
    for (const page of query.data.pages) {
      if (Array.isArray(page.data)) {
        allItems.push(...page.data);
      }
    }

    // Deduplicate by id or clientId
    const seen = new Set<string>();
    const unique: ChatMessage[] = [];

    for (const msg of allItems) {
      const key = msg.id || msg.clientId;
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(msg);
      }
    }

    // Sort ascending by createdAt (oldest first)
    return unique.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [query.data]);

  // Handle incoming real-time messages for this conversation
  useWsEvent('message.new', (payload: WSMessageNewPayload) => {
    if (!payload?.message || payload.message.conversationId !== conversationId) {
      return;
    }

    const incoming = payload.message;
    const newMsg: ChatMessage = {
      ...incoming,
      status: incoming.senderId === currentUserId ? 'sent' : undefined,
    };

    queryClient.setQueryData<any>(queryKey, (old: any) => {
      if (!old || !old.pages || old.pages.length === 0) {
        return {
          pages: [{ data: [newMsg], hasMore: false }],
          pageParams: [undefined],
        };
      }

      // Check if message already exists (e.g. from optimistic UI)
      const firstPage = old.pages[0];
      const items: ChatMessage[] = firstPage.data || [];
      const matchIndex = items.findIndex(
        (m) => m.id === newMsg.id || (m.clientId && m.clientId === newMsg.clientId)
      );

      let updatedFirstPageItems: ChatMessage[];
      if (matchIndex !== -1) {
        updatedFirstPageItems = items.map((m, idx) =>
          idx === matchIndex ? { ...m, ...newMsg, status: 'sent' } : m
        );
      } else {
        // Prepend to first page (since pages are newest-first)
        updatedFirstPageItems = [newMsg, ...items];
      }

      return {
        ...old,
        pages: [
          { ...firstPage, data: updatedFirstPageItems },
          ...old.pages.slice(1),
        ],
      };
    });
  });

  // Handle message.read to update delivered/read checkmarks
  useWsEvent('message.read', (payload: WSMessageReadPayload) => {
    if (!payload?.conversationId || payload.conversationId !== conversationId) {
      return;
    }

    queryClient.setQueryData<any>(queryKey, (old: any) => {
      if (!old?.pages) return old;

      const updatedPages = old.pages.map((page: any) => ({
        ...page,
        data: (page.data || []).map((m: ChatMessage) => {
          if (m.senderId === currentUserId) {
            return { ...m, status: 'read' as const };
          }
          return m;
        }),
      }));

      return { ...old, pages: updatedPages };
    });
  });

  // Handle real-time message deletion
  useWsEvent('message.deleted', (payload: any) => {
    const msgId = payload?.messageId || payload?.id;
    if (!msgId) return;
    if (payload?.conversationId && payload.conversationId !== conversationId) return;

    queryClient.setQueriesData<any>(
      { queryKey: ['messages', conversationId] },
      (old: any) => {
        if (!old?.pages) return old;

        const updatedPages = old.pages.map((page: any) => ({
          ...page,
          data: (page.data || []).map((m: ChatMessage) => {
            if (m.id === msgId || (m.clientId && m.clientId === msgId)) {
              return { ...m, deleted: true, body: '' };
            }
            return m;
          }),
        }));

        return { ...old, pages: updatedPages };
      }
    );
  });

  // Delete message helper
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId || !messageId) return;

      // 1. Optimistically update message cache
      queryClient.setQueriesData<any>(
        { queryKey: ['messages', conversationId] },
        (old: any) => {
          if (!old?.pages) return old;

          const updatedPages = old.pages.map((page: any) => ({
            ...page,
            data: (page.data || []).map((m: ChatMessage) => {
              if (m.id === messageId || (m.clientId && m.clientId === messageId)) {
                return { ...m, deleted: true, body: '' };
              }
              return m;
            }),
          }));

          return { ...old, pages: updatedPages };
        }
      );

      // 2. Optimistically update conversation preview snippet in sidebar
      queryClient.setQueriesData<Conversation[]>(
        { queryKey: ['conversations'] },
        (old) => {
          if (!old) return old;
          return old.map((c) => {
            if (c.id === conversationId && c.lastMessage && c.lastMessage.id === messageId) {
              return {
                ...c,
                lastMessage: {
                  id: c.lastMessage.id,
                  senderId: c.lastMessage.senderId,
                  createdAt: c.lastMessage.createdAt,
                  body: 'Message deleted',
                },
              };
            }
            return c;
          });
        }
      );

      try {
        await chatApi.deleteMessage(conversationId, messageId);
      } catch (err) {
        // Invalidate on error to re-sync
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        throw err;
      }
    },
    [conversationId, queryClient, queryKey]
  );

  // Mark conversation as read helper
  const markAsRead = useCallback(
    async (messageId?: string) => {
      if (!conversationId || !messageId) return;
      try {
        if (status === 'connected') {
          await sendRead(conversationId, messageId);
        } else {
          await chatApi.markReadHttp(conversationId, messageId);
        }
      } catch {
        // Fallback to HTTP if WS fails
        try {
          await chatApi.markReadHttp(conversationId, messageId);
        } catch {
          // Best-effort
        }
      }
    },
    [conversationId, sendRead, status]
  );

  return {
    ...query,
    messages,
    markAsRead,
    deleteMessage,
  };
}
