import { useQuery } from '@tanstack/react-query';
import { coreApi } from '@/lib/api';

export const META_QUERY_KEY = ['meta'];

export function useMeta() {
  return useQuery({
    queryKey: META_QUERY_KEY,
    queryFn: () => coreApi.getMeta(),
    staleTime: 5 * 60 * 1000,
  });
}

