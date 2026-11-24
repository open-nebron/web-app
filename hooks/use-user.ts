'use client';

import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/chat-api';
import type { PublicUser } from '@/lib/chat-types';

export function useUser(userId?: string | null) {
  return useQuery<PublicUser | null>({
    queryKey: ['user', userId],
    queryFn: async () => {
      if (!userId) return null;
      return chatApi.getUserById(userId);
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useUserByUsername(username?: string | null) {
  return useQuery<PublicUser | null>({
    queryKey: ['user-by-username', username],
    queryFn: async () => {
      if (!username) return null;
      return chatApi.getUserByUsername(username);
    },
    enabled: Boolean(username),
    staleTime: 5 * 60 * 1000,
  });
}
