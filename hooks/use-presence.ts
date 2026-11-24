'use client';

import { useChatStore, type PresenceInfo } from '@/lib/chat-store';

export function usePresence(userId?: string): PresenceInfo {
  return useChatStore((s) => {
    if (!userId) return { status: 'offline' };
    return s.presenceByUser[userId] || { status: 'offline' };
  });
}
