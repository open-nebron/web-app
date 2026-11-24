import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from '@/components/ui/use-toast';
import type { LoginFormData, RegisterFormData } from '@/lib/schemas';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, status, clear } = useAuthStore();

  const getRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get('returnTo');
      if (returnTo && returnTo.startsWith('/')) {
        return returnTo;
      }
    }
    return '/';
  };

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: LoginFormData) => {
      return authApi.login(email, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in to Nebron.',
      });
      router.push(getRedirectUrl());
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message || 'Invalid email or password',
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: RegisterFormData) => {
      await authApi.register(email, password);
      return authApi.login(email, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: 'Account created!',
        description: 'Welcome to Nebron.',
      });
      router.push(getRedirectUrl());
    },
    onError: (error: { message?: string }) => {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error.message || 'Could not complete registration',
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authApi.logout();
    },
    onSuccess: () => {
      queryClient.clear();
      clear();
      router.push('/login');
    },
    onError: () => {
      queryClient.clear();
      clear();
      router.push('/login');
    },
  });

  return {
    user,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
}

