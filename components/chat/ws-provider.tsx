'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WsClient, type WsStatus } from '@/lib/ws-client';
import { useAuthStore } from '@/lib/auth-store';
import { useChatStore } from '@/lib/chat-store';
import type { WSTypingPayload, WSPresencePayload, ChatMessage, ReactionSummary } from '@/lib/chat-types';
import {
  applyCommentDeletedEvent,
  applyCommentLikeEvent,
  applyCommentRepliedEvent,
  applyCommentUpdatedEvent,
  type CommentDeletedWsPayload,
  type CommentLikedWsPayload,
  type CommentPinnedWsPayload,
  type CommentRepliedWsPayload,
  type CommentUpdatedWsPayload,
} from '@/lib/comment-cache';

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
  sendMessage: (
    conversationId: string,
    body: string,
    clientId?: string,
    replyToId?: string,
    forwardOf?: { messageId: string; conversationId: string; senderId?: string }
  ) => Promise<WsSendResult>;
  sendRead: (conversationId: string, messageId: string) => Promise<unknown>;
  sendTyping: (conversationId: string, isTyping: boolean) => Promise<unknown>;
  subscribeChannel: (conversationId: string) => void;
  unsubscribeChannel: (conversationId: string) => void;
}

const WsContext = createContext<WsContextType | null>(null);

export function WsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const authStatus = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.userId ?? null);
  const clientRef = useRef<WsClient | null>(null);

  const {
    wsStatus,
    setWsStatus,
    addTyping,
    clearTyping,
    pruneExpiredTyping,
    setPresence,
    batchSetPresence,
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

    const unsubTyping = client.on('typing.update', (data: unknown) => {
      const payload: WSTypingPayload = (data as { payload?: WSTypingPayload })?.payload ?? (data as WSTypingPayload);
      if (!payload?.conversationId || !payload?.userId) return;
      const isTyping = Boolean(payload.typing ?? payload.isTyping);
      if (isTyping) {
        addTyping(payload.conversationId, payload.userId);
      } else {
        clearTyping(payload.conversationId, payload.userId);
      }
    });

    const unsubPresence = client.on('presence.update', (data: unknown) => {
      const payload: WSPresencePayload = (data as { payload?: WSPresencePayload })?.payload ?? (data as WSPresencePayload);
      if (!payload?.userId) return;
      const isOnline = payload.online !== undefined
        ? payload.online
        : payload.status === 'online';
      setPresence(payload.userId, {
        status: isOnline ? 'online' : 'offline',
        lastSeenAt: payload.lastSeenAt,
      });
    });

    const unsubPresenceSnapshot = client.on('presence.snapshot', (data: unknown) => {
      const raw = data as {
        payload?: { users?: Array<{ userId: string; online: boolean; lastSeenAt?: string }> };
        users?: Array<{ userId: string; online: boolean; lastSeenAt?: string }>;
      };
      const users = raw?.payload?.users ?? raw?.users;
      if (!Array.isArray(users) || users.length === 0) return;
      const entries: Record<string, { status: 'online' | 'offline'; lastSeenAt?: string }> = {};
      for (const u of users) {
        if (u?.userId) {
          entries[u.userId] = {
            status: u.online ? 'online' : 'offline',
            ...(u.lastSeenAt ? { lastSeenAt: u.lastSeenAt } : {}),
          };
        }
      }
      batchSetPresence(entries);
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

    const unsubRoleChanged = client.on('conversation.role_changed', (data: unknown) => {
      const raw = data as { payload?: { conversationId?: string } };
      const payload = raw?.payload ?? (data as { conversationId?: string });
      if (payload?.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['group-members', payload.conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    });

    const unsubMemberJoined = client.on('conversation.member_joined', (data: unknown) => {
      const raw = data as { payload?: { conversationId?: string } };
      const payload = raw?.payload ?? (data as { conversationId?: string });
      if (payload?.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['group-members', payload.conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    });

    const unsubMemberRemoved = client.on('conversation.member_removed', (data: unknown) => {
      const raw = data as { payload?: { conversationId?: string } };
      const payload = raw?.payload ?? (data as { conversationId?: string });
      if (payload?.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['group-members', payload.conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    });

    const unsubRenamed = client.on('conversation.renamed', (data: unknown) => {
      const raw = data as { payload?: { conversationId?: string } };
      const payload = raw?.payload ?? (data as { conversationId?: string });
      if (payload?.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    });

    const unsubFollowed = client.on('core.user.followed', () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['relationship'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    });

    const unsubUnfollowed = client.on('core.user.unfollowed', () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['relationship'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    });

    const unsubPostCreated = client.on('core.post.created', () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    });

    const unsubPostDeleted = client.on('core.post.deleted', (data: unknown) => {
      const raw = data as { payload?: { postId?: string } };
      const payload = raw?.payload ?? (data as { postId?: string });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (payload?.postId) {
        queryClient.invalidateQueries({ queryKey: ['post', payload.postId] });
      }
    });

    const unsubPostLiked = client.on('core.post.liked', (data: unknown) => {
      const raw = data as { payload?: { postId?: string } };
      const payload = raw?.payload ?? (data as { postId?: string });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (payload?.postId) {
        queryClient.invalidateQueries({ queryKey: ['post', payload.postId] });
        queryClient.invalidateQueries({ queryKey: ['post-likes', payload.postId] });
      }
    });

    const unsubPostUnliked = client.on('core.post.unliked', (data: unknown) => {
      const raw = data as { payload?: { postId?: string } };
      const payload = raw?.payload ?? (data as { postId?: string });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (payload?.postId) {
        queryClient.invalidateQueries({ queryKey: ['post', payload.postId] });
        queryClient.invalidateQueries({ queryKey: ['post-likes', payload.postId] });
      }
    });

    const unsubCommentCreated = client.on('core.comment.created', (data: unknown) => {
      const raw = data as { payload?: { postId?: string; reelId?: string; targetType?: string } };
      const payload = raw?.payload ?? (data as { postId?: string; reelId?: string; targetType?: string });
      const targetId = payload?.reelId || payload?.postId;
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: ['comments', targetId] });
        queryClient.invalidateQueries({ queryKey: ['post', targetId] });
        queryClient.invalidateQueries({ queryKey: ['reel-comments', targetId] });
        queryClient.invalidateQueries({ queryKey: ['reel', targetId] });
        queryClient.invalidateQueries({ queryKey: ['reels-feed'] });
      }
    });

    const unsubCommentDeleted = client.on('core.comment.deleted', (data: unknown) => {
      const raw = data as { payload?: CommentDeletedWsPayload };
      const payload = raw?.payload ?? (data as CommentDeletedWsPayload);
      const targetId = payload?.reelId || payload?.postId;
      if (payload?.commentId) {
        applyCommentDeletedEvent(queryClient, payload);
      }
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (targetId) {
        queryClient.invalidateQueries({ queryKey: ['comments', targetId] });
        queryClient.invalidateQueries({ queryKey: ['post', targetId] });
        queryClient.invalidateQueries({ queryKey: ['reel-comments', targetId] });
        queryClient.invalidateQueries({ queryKey: ['reel', targetId] });
        queryClient.invalidateQueries({ queryKey: ['reels-feed'] });
      }
    });

    const unsubCommentReplied = client.on('core.comment.replied', (data: unknown) => {
      const raw = data as { payload?: CommentRepliedWsPayload };
      const payload = raw?.payload ?? (data as CommentRepliedWsPayload);
      if (payload?.parentCommentId) {
        applyCommentRepliedEvent(queryClient, payload);
      }
    });

    const unsubCommentLiked = client.on('core.comment.liked', (data: unknown) => {
      const raw = data as { payload?: CommentLikedWsPayload };
      const payload = raw?.payload ?? (data as CommentLikedWsPayload);
      if (payload?.commentId) {
        applyCommentLikeEvent(queryClient, { ...payload, delta: 1 });
      }
    });

    const unsubCommentUnliked = client.on('core.comment.unliked', (data: unknown) => {
      const raw = data as { payload?: CommentLikedWsPayload };
      const payload = raw?.payload ?? (data as CommentLikedWsPayload);
      if (payload?.commentId) {
        applyCommentLikeEvent(queryClient, { ...payload, delta: -1 });
      }
    });

    const unsubCommentUpdated = client.on('core.comment.updated', (data: unknown) => {
      const raw = data as { payload?: CommentUpdatedWsPayload };
      const payload = raw?.payload ?? (data as CommentUpdatedWsPayload);
      if (payload?.commentId && typeof payload.body === 'string') {
        applyCommentUpdatedEvent(queryClient, payload);
      }
    });

    const unsubCommentPinned = client.on('core.comment.pinned', (data: unknown) => {
      const raw = data as { payload?: CommentPinnedWsPayload };
      const payload = raw?.payload ?? (data as CommentPinnedWsPayload);
      if (payload?.postId) {
        queryClient.invalidateQueries({ queryKey: ['comments', payload.postId] });
        queryClient.invalidateQueries({ queryKey: ['post', payload.postId] });
      }
    });

    const unsubCommentUnpinned = client.on('core.comment.unpinned', (data: unknown) => {
      const raw = data as { payload?: CommentPinnedWsPayload };
      const payload = raw?.payload ?? (data as CommentPinnedWsPayload);
      if (payload?.postId) {
        queryClient.invalidateQueries({ queryKey: ['comments', payload.postId] });
        queryClient.invalidateQueries({ queryKey: ['post', payload.postId] });
      }
    });

    const unsubPostEdited = client.on('core.post.edited', (data: unknown) => {
      const raw = data as { payload?: { postId?: string } };
      const payload = raw?.payload ?? (data as { postId?: string });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['popular-posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-likes'] });
      if (payload?.postId) {
        queryClient.invalidateQueries({ queryKey: ['post', payload.postId] });
      }
    });

    const unsubStoryCreated = client.on('core.story.created', (data: unknown) => {
      const raw = data as { payload?: { authorId?: string } };
      const payload = raw?.payload ?? (data as { authorId?: string });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      if (payload?.authorId) {
        queryClient.invalidateQueries({ queryKey: ['user-stories', payload.authorId] });
      }
    });

    const unsubStoryDeleted = client.on('core.story.deleted', (data: unknown) => {
      const raw = data as { payload?: { authorId?: string } };
      const payload = raw?.payload ?? (data as { authorId?: string });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      if (payload?.authorId) {
        queryClient.invalidateQueries({ queryKey: ['user-stories', payload.authorId] });
      }
    });

    return () => {
      unsubStatus();
      unsubTyping();
      unsubPresence();
      unsubPresenceSnapshot();
      unsubStarred();
      unsubUnstarred();
      unsubReactionAdded();
      unsubReactionRemoved();
      unsubRoleChanged();
      unsubMemberJoined();
      unsubMemberRemoved();
      unsubRenamed();
      unsubFollowed();
      unsubUnfollowed();
      unsubPostCreated();
      unsubPostDeleted();
      unsubPostLiked();
      unsubPostUnliked();
      unsubCommentCreated();
      unsubCommentDeleted();
      unsubCommentReplied();
      unsubCommentLiked();
      unsubCommentUnliked();
      unsubCommentUpdated();
      unsubCommentPinned();
      unsubCommentUnpinned();
      unsubPostEdited();
      unsubStoryCreated();
      unsubStoryDeleted();
    };
  }, [client, queryClient, setWsStatus, addTyping, clearTyping, setPresence, batchSetPresence, starMessageId, unstarMessageId]);

  // Connect / disconnect on accessToken changes
  useEffect(() => {
    if (authStatus === 'authenticated' && accessToken) {
      client.connect(accessToken);
    } else if (authStatus === 'unauthenticated') {
      client.disconnect();
    }
  }, [client, accessToken, authStatus]);

  // Populate starred messages cache once per authenticated session rather than on every token rotation
  useEffect(() => {
    if (authStatus !== 'authenticated' || !userId) return;
    import('@/lib/chat-api').then(({ chatApi }) => {
      chatApi.listStarred({ limit: 100 })
        .then((res) => {
          if (res?.data) {
            setStarredMessageIds(res.data.map((item) => item.messageId));
          }
        })
        .catch(() => {});
    });
  }, [authStatus, userId, setStarredMessageIds]);

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
    sendMessage: (convId, body, cId, replyToId, forwardOf) =>
      client.sendMessage(convId, body, cId, replyToId, forwardOf),
    sendRead: (convId, msgId) => client.sendRead(convId, msgId),
    sendTyping: (convId, isTyping) => client.sendTyping(convId, isTyping),
    subscribeChannel: (convId) => client.subscribeChannel(convId),
    unsubscribeChannel: (convId) => client.unsubscribeChannel(convId),
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
