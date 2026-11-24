'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  User,
  Palette,
  Globe,
  Shield,
  Bell,
  UserX,
  KeyRound,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '@/lib/chat-api';
import { Badge } from '@/components/ui/badge';

interface MobileNavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function SettingsNavMobile() {
  const { data: blockedData } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: () => chatApi.getBlockedUsers(),
    staleTime: 60 * 1000,
  });

  const blockedCount = blockedData?.blocked?.length ?? 0;

  const sections: MobileNavItem[] = [
    {
      href: '/settings/profile',
      label: 'Profile',
      description: 'Your name, username, bio, and details',
      icon: User,
    },
    {
      href: '/settings/appearance',
      label: 'Appearance',
      description: 'Theme preference and interface style',
      icon: Palette,
    },
    {
      href: '/settings/language',
      label: 'Language',
      description: 'Display language preferences',
      icon: Globe,
    },
    {
      href: '/settings/privacy',
      label: 'Privacy',
      description: 'Message requests and safety options',
      icon: Shield,
    },
    {
      href: '/settings/notifications',
      label: 'Notifications',
      description: 'Ringtone, alerts, and sounds',
      icon: Bell,
    },
    {
      href: '/settings/blocked',
      label: 'Blocked users',
      description: blockedCount > 0 ? `${blockedCount} blocked user${blockedCount === 1 ? '' : 's'}` : 'Manage blocked users',
      icon: UserX,
    },
    {
      href: '/settings/account',
      label: 'Account',
      description: 'Email, password, and session actions',
      icon: KeyRound,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account settings and preferences on nebron
        </p>
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 active:bg-muted transition-colors shadow-2xs group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm leading-tight text-foreground group-hover:text-primary transition-colors">
                      {section.label}
                    </h3>
                    {section.href === '/settings/blocked' && blockedCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-4">
                        {blockedCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {section.description}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
