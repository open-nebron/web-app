'use client';

import * as React from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { socialApi } from '@/lib/social-api';
import type { Post, UserSuggestionItem } from '@/lib/types';

export function useFeed() {
  const query = useInfiniteQuery<{ data: Post[]; hasMore: boolean }>({
    queryKey: ['feed'],
    queryFn: async ({ pageParam }) => {
      return socialApi.getFeed({
        limit: 20,
        before: pageParam as string | undefined,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.hasMore || lastPage.data.length === 0) return undefined;
      return lastPage.data[lastPage.data.length - 1].createdAt;
    },
    staleTime: 30 * 1000,
  });

  const posts = React.useMemo(() => {
    return query.data?.pages.flatMap((page) => page.data) ?? [];
  }, [query.data]);

  return {
    ...query,
    posts,
  };
}

export function useSuggestions(limit: number = 10) {
  return useQuery<UserSuggestionItem[]>({
    queryKey: ['suggestions', limit],
    queryFn: () => socialApi.getSuggestions(limit),
    staleTime: 60 * 1000,
  });
}
