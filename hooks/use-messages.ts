'use client';

import { useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi, isValidConversationId } from '@/lib/chat-api';
import type { ChatMessage, Conversation, WSMessageNewPayload, WSMessageReadPayload } from '@/lib/chat-types';
import { useWsEvent, useWsClient } from '@/hooks/use-ws';
import { useAuthStore } from '@/lib/auth-store';

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.userId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { sendRead, status } = useWsClient();
  const isValidId = isValidConversationId(conversationId);

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
    enabled: isValidId && Boolean(accessToken),
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

  // Handle real-time message editing
  useWsEvent('message.edited', (payload: unknown) => {
    const raw = payload as { payload?: import('@/lib/chat-types').WSMessageEditedPayload; messageId?: string; id?: string; conversationId?: string; body?: string; editedAt?: string };
    const data = raw?.payload || raw;
    if (!data) return;
    const msgId = 'messageId' in data && data.messageId ? data.messageId : ('id' in data ? (data as { id?: string }).id : undefined);
    const convId = data.conversationId;
    if (convId && convId !== conversationId) return;

    queryClient.setQueriesData<{ pages: { data: ChatMessage[]; nextCursor?: string; hasMore?: boolean }[]; pageParams: unknown[] }>(
      { queryKey: ['messages', conversationId] },
      (old) => {
        if (!old?.pages) return old;

        const updatedPages = old.pages.map((page) => ({
          ...page,
          data: (page.data || []).map((m: ChatMessage) => {
            if (m.id === msgId || (m.clientId && m.clientId === msgId)) {
              return {
                ...m,
                body: data.body || m.body,
                editedAt: data.editedAt || m.editedAt,
              };
            }
            return m;
          }),
        }));

        return { ...old, pages: updatedPages };
      }
    );
  });

  // Handle real-time message deletion
  useWsEvent('message.deleted', (payload: unknown) => {
    const raw = payload as { payload?: { messageId?: string; id?: string; conversationId?: string } } & { messageId?: string; id?: string; conversationId?: string };
    const data = raw?.payload || raw;
    const msgId = data?.messageId || data?.id;
    if (!msgId) return;
    if (data?.conversationId && data.conversationId !== conversationId) return;

    queryClient.setQueriesData<{ pages: { data: ChatMessage[]; nextCursor?: string; hasMore?: boolean }[]; pageParams: unknown[] }>(
      { queryKey: ['messages', conversationId] },
      (old) => {
        if (!old?.pages) return old;

        const updatedPages = old.pages.map((page) => ({
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

  // Handle real-time reaction added
  useWsEvent('reaction.added', (payload: unknown) => {
    const raw = payload as { payload?: import('@/lib/chat-types').WSReactionAddedPayload };
    const data = raw?.payload ?? (payload as import('@/lib/chat-types').WSReactionAddedPayload);
    if (!data?.conversationId || data.conversationId !== conversationId || !data.messageId || !data.emoji) {
      return;
    }

    queryClient.setQueriesData<{ pages: { data: ChatMessage[]; nextCursor?: string; hasMore?: boolean }[]; pageParams: unknown[] }>(
      { queryKey: ['messages', conversationId] },
      (old) => {
        if (!old?.pages) return old;

        const updatedPages = old.pages.map((page) => ({
          ...page,
          data: (page.data || []).map((m: ChatMessage) => {
            if (m.id !== data.messageId) return m;
            const current = m.reactions || [];
            const idx = current.findIndex((r) => r.emoji === data.emoji);
            let updated: import('@/lib/chat-types').ReactionSummary[];
            if (idx !== -1) {
              const existing = current[idx];
              const hasUser = existing.userIds.includes(data.userId);
              const newUserIds = hasUser ? existing.userIds : [...existing.userIds, data.userId];
              const newCount = hasUser ? existing.count : existing.count + 1;
              updated = current.map((r, i) => (i === idx ? { ...r, count: newCount, userIds: newUserIds } : r));
            } else {
              updated = [...current, { emoji: data.emoji, count: 1, userIds: [data.userId] }];
            }
            return { ...m, reactions: updated };
          }),
        }));

        return { ...old, pages: updatedPages };
      }
    );
  });

  // Handle real-time reaction removed
  useWsEvent('reaction.removed', (payload: unknown) => {
    const raw = payload as { payload?: import('@/lib/chat-types').WSReactionRemovedPayload };
    const data = raw?.payload ?? (payload as import('@/lib/chat-types').WSReactionRemovedPayload);
    if (!data?.conversationId || data.conversationId !== conversationId || !data.messageId || !data.emoji) {
      return;
    }

    queryClient.setQueriesData<{ pages: { data: ChatMessage[]; nextCursor?: string; hasMore?: boolean }[]; pageParams: unknown[] }>(
      { queryKey: ['messages', conversationId] },
      (old) => {
        if (!old?.pages) return old;

        const updatedPages = old.pages.map((page) => ({
          ...page,
          data: (page.data || []).map((m: ChatMessage) => {
            if (m.id !== data.messageId) return m;
            const current = m.reactions || [];
            const idx = current.findIndex((r) => r.emoji === data.emoji);
            if (idx === -1) return m;
            const existing = current[idx];
            const hasUser = existing.userIds.includes(data.userId);
            if (!hasUser) return m;
            const newUserIds = existing.userIds.filter((u) => u !== data.userId);
            const newCount = Math.max(0, existing.count - 1);
            let updated: import('@/lib/chat-types').ReactionSummary[];
            if (newCount === 0) {
              updated = current.filter((_, i) => i !== idx);
            } else {
              updated = current.map((r, i) => (i === idx ? { ...r, count: newCount, userIds: newUserIds } : r));
            }
            return { ...m, reactions: updated };
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
