'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, MessageSquare } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMySpaces } from '@/hooks/useSpaces';
import { useSpacesStore } from '@/lib/spaces-store';
import { SpaceIcon } from './space-icon';
import { CreateSpaceDialog } from './create-space-dialog';
import { cn } from '@/lib/utils';

interface SpaceRailProps {
  activeSpaceId?: string;
}

export function SpaceRail({ activeSpaceId }: SpaceRailProps) {
  const pathname = usePathname();
  const { data: spaces = [] } = useMySpaces();
  const unreadBySpace = useSpacesStore((s) => s.unreadBySpace);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isHomeActive = !activeSpaceId && !pathname.startsWith('/chat');
  const isChatActive = !activeSpaceId && pathname.startsWith('/chat');

  return (
    <>
      <aside
        aria-label="Spaces rail"
        className="w-12 shrink-0 h-screen sticky top-0 border-r bg-card/95 flex flex-col items-center py-2.5 gap-2 select-none z-20"
      >
        {/* Home icon */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                aria-label="Home"
                className={cn(
                  'w-9 h-9 flex items-center justify-center transition-all duration-150 border',
                  isHomeActive
                    ? 'rounded-xl bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'rounded-2xl bg-muted text-muted-foreground border-border/60 hover:rounded-xl hover:bg-accent hover:text-foreground'
                )}
              >
                <Home className="w-4 h-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium">
              Home Feed
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Direct / Group Chat quick switcher */}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/chat"
                aria-label="Direct Messages"
                className={cn(
                  'w-9 h-9 flex items-center justify-center transition-all duration-150 border',
                  isChatActive
                    ? 'rounded-xl bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'rounded-2xl bg-muted text-muted-foreground border-border/60 hover:rounded-xl hover:bg-accent hover:text-foreground'
                )}
              >
                <MessageSquare className="w-4 h-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs font-medium">
              Direct Messages
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-6 h-px bg-border my-0.5 shrink-0" />

        {/* Space icons list (scrolls cleanly if >10 spaces) */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-2 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {spaces.map((space) => (
            <SpaceIcon
              key={space.id}
              space={space}
              isActive={space.id === activeSpaceId}
              unreadCount={unreadBySpace[space.id] || 0}
            />
          ))}

          {/* Create or Join Space (+) button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setCreateDialogOpen(true)}
                  aria-label="Create or join a space"
                  data-testid="space-rail-add-btn"
                  className="w-9 h-9 rounded-2xl border border-dashed border-border bg-muted/40 hover:bg-emerald-500/15 hover:text-emerald-600 hover:border-emerald-500/50 hover:rounded-xl text-muted-foreground flex items-center justify-center transition-all duration-150 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium">
                Create or Join Space
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </aside>

      <CreateSpaceDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}
