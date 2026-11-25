'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AdminSidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      title: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
      active: pathname === '/admin',
    },
    {
      title: 'Report Queue',
      href: '/admin/reports',
      icon: ShieldAlert,
      active: pathname.startsWith('/admin/reports'),
    },
    {
      title: 'User Management',
      href: '/admin/users',
      icon: Users,
      active: pathname.startsWith('/admin/users'),
    },
  ];

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen select-none shrink-0">
      <div className="h-16 border-b flex items-center px-6 gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-destructive flex items-center justify-center text-destructive-foreground font-bold shadow">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base leading-tight tracking-tight">Nebron</span>
            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
              Admin
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Moderation Portal
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="px-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Console
            </h4>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      item.active
                        ? 'bg-destructive/15 text-destructive font-semibold shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="pt-4 border-t space-y-2">
          <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2 text-xs">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Return to App
            </Link>
          </Button>
          <p className="text-[10px] text-muted-foreground/60 px-2 text-center">
            Nebron Moderation Console v3
          </p>
        </div>
      </div>
    </aside>
  );
}
