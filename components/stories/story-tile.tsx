'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, normalizeStorageUrl } from '@/lib/utils';

interface StoryTileProps {
  username: string;
  name?: string | null;
  avatarUrl?: string | null;
  isMine?: boolean;
  hasStories?: boolean;
  hasUnviewed?: boolean;
  onClick: () => void;
  onAddClick?: () => void;
}

export function StoryTile({
  username,
  name,
  avatarUrl,
  isMine = false,
  hasStories = false,
  hasUnviewed = false,
  onClick,
  onAddClick,
}: StoryTileProps) {
  const initials = (name || username || 'U').slice(0, 2).toUpperCase();
  const displayName = isMine ? 'Your story' : name || username;

  const ringClass = hasStories
    ? hasUnviewed
      ? 'bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400'
      : 'bg-muted-foreground/35'
    : 'border-2 border-dashed border-muted-foreground/40 bg-transparent';

  return (
    <div
      className="flex flex-col items-center gap-1.5 shrink-0 select-none group"
      data-testid={isMine ? 'story-tile-mine' : `story-tile-${username}`}
      data-ring={hasStories ? (hasUnviewed ? 'unviewed' : 'viewed') : 'empty'}
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          aria-label={isMine ? (hasStories ? 'View your story' : 'Add to story') : `View ${username}'s story`}
          className={cn(
            'w-16 h-16 rounded-full p-[2.5px] transition-transform duration-150 group-hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            ringClass
          )}
        >
          <div className="w-full h-full rounded-full p-[2px] bg-background">
            <Avatar className="w-full h-full">
              {avatarUrl && (
                <AvatarImage src={normalizeStorageUrl(avatarUrl)} alt={displayName} />
              )}
              <AvatarFallback className="text-sm font-semibold bg-muted">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </button>

        {isMine && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onAddClick) {
                onAddClick();
              } else {
                onClick();
              }
            }}
            aria-label="Add a story"
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
          </button>
        )}
      </div>

      <span className="text-xs font-medium text-foreground/90 max-w-[72px] truncate text-center">
        {displayName}
      </span>
    </div>
  );
}
