'use client';

import React from 'react';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Space } from '@/lib/spaces-api';
import { cn, normalizeStorageUrl } from '@/lib/utils';

interface SpaceIconProps {
  space: Space;
  isActive: boolean;
  unreadCount?: number;
}

export function SpaceIcon({ space, isActive, unreadCount = 0 }: SpaceIconProps) {
  const words = space.name.trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase()
      : space.name.slice(0, 2).toUpperCase();

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex items-center justify-center w-full group">
            {/* Active / hover indicator pill */}
            <span
              className={cn(
                'absolute left-0 w-1 rounded-r-full bg-primary transition-all duration-150',
                isActive ? 'h-7' : unreadCount > 0 ? 'h-2 group-hover:h-4' : 'h-0 group-hover:h-4'
              )}
            />

            <Link
              href={`/spaces/${space.id}`}
              aria-label={space.name}
              data-testid={`space-rail-item-${space.id}`}
              className={cn(
                'relative w-9 h-9 flex items-center justify-center text-xs font-bold transition-all duration-150 overflow-hidden border',
                isActive
                  ? 'rounded-xl bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'rounded-2xl bg-muted text-foreground border-border/60 hover:rounded-xl hover:bg-primary/90 hover:text-primary-foreground'
              )}
            >
              {space.iconKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={normalizeStorageUrl(space.iconKey)}
                  alt={space.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials || 'S'}</span>
              )}
            </Link>

            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} unread messages`}
                className="pointer-events-none absolute -bottom-0.5 right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-card"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium text-xs">
          {space.name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
