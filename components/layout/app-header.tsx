'use client';

import * as React from 'react';
import Link from 'next/link';
import { useProfile } from '@/hooks/use-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

interface AppHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function AppHeader({ title, actions }: AppHeaderProps) {
  const { data: profile, isLoading } = useProfile();

  const userInitial = profile?.name
    ? profile.name[0].toUpperCase()
    : profile?.username
    ? profile.username[0].toUpperCase()
    : 'U';

  return (
    <header className="h-16 border-b px-6 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
      <h1 className="text-xl font-bold tracking-tight text-foreground">
        {title}
      </h1>

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
                <AvatarImage src={profile.avatarUrl} alt={profile.name || profile.username} />
              )}
              <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
            </Avatar>
          )}
        </Link>
      </div>
    </header>
  );
}

