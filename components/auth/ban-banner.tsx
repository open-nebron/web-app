'use client';

import * as React from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogOut } from 'lucide-react';

export function BanBanner() {
  const bannedState = useAuthStore((state) => state.bannedState);

  if (!bannedState?.isBanned) {
    return null;
  }

  const reason = bannedState.reason || 'Violation of community guidelines';

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      useAuthStore.getState().clear();
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full bg-destructive text-destructive-foreground px-4 py-3 shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-medium"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive-foreground animate-pulse" />
        <span>
          Your account has been suspended. Reason: <span className="font-semibold underline">{reason}</span>. Contact{' '}
          <a href="mailto:support@nebron.com" className="underline font-bold hover:opacity-80">
            support@nebron.com
          </a>
        </span>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleLogout}
        className="shrink-0 h-8 gap-1.5 text-xs font-semibold bg-background text-foreground hover:bg-background/90"
      >
        <LogOut className="h-3.5 w-3.5" />
        Log out
      </Button>
    </div>
  );
}
