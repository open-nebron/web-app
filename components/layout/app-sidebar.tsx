'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  User,
  Settings,
  LogOut,
  ChevronUp,
  Phone,
  Star,
  Search,
  Keyboard,
  Home,
  Play,
  Compass,
  ShieldAlert,
} from 'lucide-react';
import { useProfile } from '@/hooks/use-profile';
import { useAuth } from '@/hooks/use-auth';
import { useConversations } from '@/hooks/use-conversations';
import { useSearchStore } from '@/lib/search-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeStorageUrl } from '@/lib/utils';

export function AppSidebar() {
  const pathname = usePathname();
  const { data: profile, isLoading } = useProfile();
  const { logout, isLoggingOut } = useAuth();
  const { conversations } = useConversations();
  const openSearch = useSearchStore((state) => state.openSearch);

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0
  );

  const userInitial = profile?.name
    ? profile.name[0].toUpperCase()
    : profile?.username
    ? profile.username[0].toUpperCase()
    : 'U';

  const isChatActive = pathname.startsWith('/chat');

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 border-b flex items-center px-6 space-x-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow">
          N
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight tracking-tight">
            Nebron
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Platform
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="px-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Navigation
            </h4>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => openSearch()}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                aria-label="Search messages"
              >
                <div className="flex items-center space-x-3">
                  <Search className="h-4 w-4" />
                  <span>Search</span>
                </div>
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border rounded">
                  ⌘K
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new KeyboardEvent('keydown', { key: '?', metaKey: true, bubbles: true })
                  );
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                aria-label="Keyboard shortcuts"
              >
                <div className="flex items-center space-x-3">
                  <Keyboard className="h-4 w-4" />
                  <span>Shortcuts</span>
                </div>
                <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted border rounded">
                  ⌘?
                </kbd>
              </button>

              <Link
                href="/"
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>

              <Link
                href="/reels"
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/reels')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <Play className="h-4 w-4" />
                <span>Reels</span>
              </Link>

              <Link
                href="/explore"
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/explore')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <Compass className="h-4 w-4" />
                <span>Explore</span>
              </Link>

              <Link
                href="/chat"
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isChatActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-4 w-4" />
                  <span>Messages</span>
                </div>
                {totalUnread > 0 && (
                  <Badge
                    variant="default"
                    className="h-4 min-w-4 px-1.5 py-0 text-[10px] rounded-full flex items-center justify-center font-bold"
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Badge>
                )}
              </Link>

              <Link
                href="/starred"
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/starred')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <Star className="h-4 w-4" />
                <span>Starred messages</span>
              </Link>

              <Link
                href="/calls"
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/calls')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <Phone className="h-4 w-4" />
                <span>Calls</span>
              </Link>

              <Link
                href="/profile"
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/profile')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>

              <Link
                href="/settings"
                className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/settings')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>

              {profile?.isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith('/admin')
                      ? 'bg-destructive/15 text-destructive font-semibold'
                      : 'text-destructive/80 hover:bg-destructive/10 hover:text-destructive'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Admin Dashboard</span>
                </Link>
              )}
            </nav>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-2 text-[11px] text-muted-foreground">
          <p>Nebron Web Client</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Real-time chat & groups</p>
        </div>
      </div>

      {/* Footer / User Menu */}
      <div className="p-3 border-t">
        {isLoading ? (
          <div className="flex items-center space-x-3 p-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="User navigation menu"
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    {profile?.avatarUrl && (
                      <AvatarImage src={normalizeStorageUrl(profile.avatarUrl)} alt={profile.name || profile.username} />
                    )}
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate leading-tight">
                      {profile?.name || profile?.username || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{profile?.username || 'user'}
                    </p>
                  </div>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="top">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>View Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/calls" className="cursor-pointer">
                  <Phone className="mr-2 h-4 w-4" />
                  <span>Calls</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                disabled={isLoggingOut}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </aside>
  );
}
