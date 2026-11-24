import * as React from 'react';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import { AppHeader } from '@/components/layout/app-header';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <AppHeader title="Settings" />
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="hidden md:block shrink-0">
            <SettingsSidebar />
          </div>
          <div className="flex-1 min-w-0 w-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
