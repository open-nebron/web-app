'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { SettingsNavMobile } from '@/components/settings/settings-nav-mobile';

export default function SettingsIndexPage() {
  const router = useRouter();

  React.useEffect(() => {
    // On desktop (>= 768px), redirect to /settings/profile
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      router.replace('/settings/profile');
    }
  }, [router]);

  return (
    <div>
      <div className="md:hidden">
        <SettingsNavMobile />
      </div>
      <div className="hidden md:flex items-center justify-center py-20 text-sm text-muted-foreground">
        Redirecting to profile settings...
      </div>
    </div>
  );
}
