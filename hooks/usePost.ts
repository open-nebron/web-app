'use client';

import { useQuery } from '@tanstack/react-query';
import { socialApi } from '@/lib/social-api';
import type { Post } from '@/lib/types';

export function usePost(postId?: string | null) {
  return useQuery<Post | null>({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) return null;
      return socialApi.getPost(postId);
    },
    enabled: Boolean(postId),
    staleTime: 30 * 1000,
  });
}
