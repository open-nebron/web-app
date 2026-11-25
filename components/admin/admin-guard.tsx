'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/admin-api';
import { Loader2 } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let mounted = true;
    adminApi
      .getStats()
      .then(() => {
        if (mounted) setIsAuthorized(true);
      })
      .catch(() => {
        if (mounted) {
          setIsAuthorized(false);
          // 403 or non-admin -> redirect to /feed as specified
          router.replace('/feed');
        }
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  if (isAuthorized === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-destructive" />
          <p className="text-sm text-muted-foreground">Verifying administrator permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
