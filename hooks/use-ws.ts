'use client';

import { useEffect, useRef } from 'react';
import { useWsClient } from '@/components/chat/ws-provider';
import type { EventHandler, WsStatus } from '@/lib/ws-client';
import { useChatStore } from '@/lib/chat-store';

export { useWsClient };

export function useWsStatus(): WsStatus {
  return useChatStore((s) => s.wsStatus);
}

export function useWsEvent(event: string, handler: EventHandler) {
  const { client } = useWsClient();
  const handlerRef = useRef<EventHandler>(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (data: any) => {
      if (handlerRef.current) {
        handlerRef.current(data);
      }
    };

    return client.on(event, listener);
  }, [client, event]);
}
