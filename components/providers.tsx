'use client';

import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/query-client';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from '@/components/ui/use-toast';

let initAuthPromise: Promise<void> | null = null;

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const setStatus = useAuthStore((s) => s.setStatus);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  React.useEffect(() => {
    if (initAuthPromise) return;

    initAuthPromise = (async () => {
      setStatus('loading');
      try {
        await authApi.refresh();
        const me = await authApi.me();
        setUser({ userId: me.userId, email: me.email });
        setStatus('authenticated');
      } catch (err: unknown) {
        clear();
        const error = err as { status?: number; message?: string };
        if (error?.status === 401) {
          // Expected when no session cookie exists
          setStatus('unauthenticated');
        } else if (error?.status === 0) {
          setStatus('unauthenticated');
          toast({
            variant: 'destructive',
            title: 'Connection error',
            description: 'Cannot reach server. Please check your connection.',
          });
        } else {
          setStatus('unauthenticated');
        }
      } finally {
        initAuthPromise = null;
      }
    })();
  }, [setStatus, setUser, clear]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthInitializer>
          {children}
          <Toaster />
        </AuthInitializer>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

