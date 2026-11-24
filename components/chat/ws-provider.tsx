'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { WsClient, type WsStatus } from '@/lib/ws-client';
import { useAuthStore } from '@/lib/auth-store';
import { useChatStore } from '@/lib/chat-store';
import type { WSTypingPayload, WSPresencePayload } from '@/lib/chat-types';

interface WsContextType {
  client: WsClient;
  status: WsStatus;
  sendMessage: (conversationId: string, body: string, clientId?: string) => Promise<any>;
  sendRead: (conversationId: string, messageId: string) => Promise<any>;
  sendTyping: (conversationId: string, isTyping: boolean) => Promise<any>;
}

const WsContext = createContext<WsContextType | null>(null);

export function WsProvider({ children }: { children: React.ReactNode }) {
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

    const unsubTyping = client.on('typing.update', (payload: WSTypingPayload) => {
      if (!payload?.conversationId || !payload?.userId) return;
      if (payload.isTyping) {
        addTyping(payload.conversationId, payload.userId);
      } else {
        clearTyping(payload.conversationId, payload.userId);
      }
    });

    const unsubPresence = client.on('presence.update', (payload: WSPresencePayload) => {
      if (!payload?.userId) return;
      setPresence(payload.userId, {
        status: payload.status,
        lastSeenAt: payload.lastSeenAt,
      });
    });

    return () => {
      unsubStatus();
      unsubTyping();
      unsubPresence();
    };
  }, [client, setWsStatus, addTyping, clearTyping, setPresence]);

  // Connect / disconnect on accessToken changes
  useEffect(() => {
    if (authStatus === 'authenticated' && accessToken) {
      client.connect(accessToken);
    } else if (authStatus === 'unauthenticated') {
      client.disconnect();
    }
  }, [client, accessToken, authStatus]);

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
