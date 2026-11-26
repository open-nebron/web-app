'use client';

import * as React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStoryViewers } from '@/hooks/useStories';
import { normalizeStorageUrl } from '@/lib/utils';

interface StoryViewersSheetProps {
  storyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StoryViewersSheet({
  storyId,
  open,
  onOpenChange,
}: StoryViewersSheetProps) {
  const { data, isLoading } = useStoryViewers(storyId, open);
  const viewers = data?.viewers ?? [];
  const viewerCount = data?.viewerCount ?? viewers.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md z-[60]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span>Story Viewers ({viewerCount})</span>
          </DialogTitle>
          <DialogDescription>
            People who have seen this story.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/60 pr-1">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Loading viewers...</span>
            </div>
          ) : viewers.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No viewers yet.
            </div>
          ) : (
            viewers.map((viewer) => {
              const initials = (viewer.name || viewer.username || 'U')
                .slice(0, 2)
                .toUpperCase();
              return (
                <Link
                  key={viewer.userId}
                  href={`/${viewer.username}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="w-9 h-9 shrink-0">
                      {viewer.avatarUrl && (
                        <AvatarImage
                          src={normalizeStorageUrl(viewer.avatarUrl)}
                          alt={viewer.username}
                        />
                      )}
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {viewer.name || viewer.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{viewer.username}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                    {formatDistanceToNow(new Date(viewer.viewedAt), { addSuffix: true })}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
