'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  Palette,
  Globe,
  Shield,
  Bell,
  Laptop,
  UserX,
  KeyRound,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/chat-api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SettingsNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
}

export function SettingsSidebar() {
  const pathname = usePathname();

  // Query blocked users count for badge
  const { data: blockedData } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: () => chatApi.getBlockedUsers(),
    staleTime: 60 * 1000,
  });

  const blockedCount = blockedData?.blocked?.length ?? 0;

  const navItems: SettingsNavItem[] = [
    {
      href: '/settings/profile',
      label: 'Profile',
      icon: User,
    },
    {
      href: '/settings/appearance',
      label: 'Appearance',
      icon: Palette,
    },
    {
      href: '/settings/language',
      label: 'Language',
      icon: Globe,
    },
    {
      href: '/settings/privacy',
      label: 'Privacy',
      icon: Shield,
    },
    {
      href: '/settings/notifications',
      label: 'Notifications',
      icon: Bell,
    },
    {
      href: '/settings/sessions',
      label: 'Sessions',
      icon: Laptop,
    },
    {
      href: '/settings/blocked',
      label: 'Blocked users',
      icon: UserX,
      badge: blockedCount > 0 ? (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center font-semibold">
          {blockedCount}
        </Badge>
      ) : null,
    },
    {
      href: '/settings/account',
      label: 'Account',
      icon: KeyRound,
    },
  ];

  return (
    <aside className="w-64 shrink-0 pr-4">
      <div className="mb-4 px-3">
        <h2 className="text-lg font-bold tracking-tight text-foreground">Settings</h2>
        <p className="text-xs text-muted-foreground">Manage your nebron preferences</p>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors select-none',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary-foreground' : 'text-muted-foreground')} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
