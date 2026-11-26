'use client';

import React, { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SpaceRail } from '@/components/spaces/space-rail';
import { ChannelSidebar } from '@/components/spaces/channel-sidebar';
import { SpaceVoiceHost } from '@/components/spaces/voice-channel-panel';
import { Button } from '@/components/ui/button';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { spaceId, channelId } = useMemo(() => {
    const spaceMatch = pathname.match(/^\/spaces\/([0-9a-fA-F]{24})(?:\/|$)/);
    const channelMatch = pathname.match(
      /^\/spaces\/([0-9a-fA-F]{24})\/channels\/([0-9a-fA-F]{24})(?:\/|$)/
    );
    return {
      spaceId: spaceMatch?.[1],
      channelId: channelMatch?.[2],
    };
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Two-Sidebar Layout */}
      <div className="hidden md:flex shrink-0">
        <SpaceRail activeSpaceId={spaceId} />
        {spaceId ? (
          <ChannelSidebar spaceId={spaceId} activeChannelId={channelId} />
        ) : (
          <AppSidebar />
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative flex z-10 h-full bg-card shadow-xl">
            <SpaceRail activeSpaceId={spaceId} />
            {spaceId ? (
              <ChannelSidebar spaceId={spaceId} activeChannelId={channelId} />
            ) : (
              <AppSidebar />
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileNavOpen(false)}
              className="absolute top-2 right-2 h-8 w-8"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {spaceId && (
          <div className="flex md:hidden items-center gap-2 px-3 py-2 border-b bg-card">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open spaces menu"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <span className="text-xs font-semibold text-muted-foreground">Space Navigation</span>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Persistent LiveKit voice connection across channel transitions */}
      <SpaceVoiceHost />
    </div>
  );
}
