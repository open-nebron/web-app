'use client';

import * as React from 'react';
import Link from 'next/link';
import { useProfile } from '@/hooks/use-profile';
import { useWsStatus } from '@/hooks/use-ws';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeStorageUrl } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function AppHeader({ title, actions }: AppHeaderProps) {
  const { data: profile, isLoading } = useProfile();
  const wsStatus = useWsStatus();

  const userInitial = profile?.name
    ? profile.name[0].toUpperCase()
    : profile?.username
    ? profile.username[0].toUpperCase()
    : 'U';

  const wsStatusText = {
    connected: 'Real-time connected',
    connecting: 'Connecting to chat server...',
    disconnected: 'Disconnected. Reconnecting...',
    'auth-failed': 'Authentication failed. Please re-login.',
  }[wsStatus] || 'Connecting...';

  const wsDotColor = {
    connected: 'bg-emerald-500',
    connecting: 'bg-amber-500 animate-pulse',
    disconnected: 'bg-rose-500',
    'auth-failed': 'bg-rose-600',
  }[wsStatus] || 'bg-amber-500';

  return (
    <header className="h-16 border-b px-6 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {title}
        </h1>

        {/* Real-time status badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 border text-[11px] text-muted-foreground cursor-default select-none">
                <span className={cn('w-2 h-2 rounded-full', wsDotColor)} />
                <span className="capitalize">{wsStatus}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{wsStatusText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center space-x-4">
        {actions && <div className="flex items-center space-x-2">{actions}</div>}

        <Link
          href="/profile"
          aria-label="View your profile"
          className="rounded-full ring-offset-background transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {isLoading ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : (
            <Avatar className="h-8 w-8">
              {profile?.avatarUrl && (
                <AvatarImage src={normalizeStorageUrl(profile.avatarUrl)} alt={profile.name || profile.username} />
              )}
              <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
            </Avatar>
          )}
        </Link>
      </div>
    </header>
  );
}
