import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coreApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from '@/components/ui/use-toast';
import type { UserProfile } from '@/lib/types';

export const PROFILE_QUERY_KEY = ['profile', 'me'];

export function useProfile() {
  const status = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => coreApi.getProfile(),
    enabled: status === 'authenticated' && !!accessToken,
    staleTime: 60 * 1000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<UserProfile>) => coreApi.updateProfile(patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, updated);
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: error.message || 'Could not update profile',
      });
    },
  });
}

export function useUpdateUsername() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (username: string) => coreApi.updateUsername(username),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, (old: UserProfile | undefined) => {
        if (!old) return old;
        return { ...old, username: data.username };
      });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Username update failed',
        description: error.message || 'Could not update username',
      });
    },
  });
}

export function useCheckUsername(username: string, enabled = true) {
  return useQuery({
    queryKey: ['username', 'check', username],
    queryFn: () => coreApi.checkUsername(username),
    enabled: enabled && username.length >= 3,
    staleTime: 10 * 1000,
  });
}

export function usePublicProfile(username: string) {
  return useQuery({
    queryKey: ['profile', 'public', username],
    queryFn: () => coreApi.getPublicProfile(username),
    enabled: !!username,
    staleTime: 60 * 1000,
  });
}

