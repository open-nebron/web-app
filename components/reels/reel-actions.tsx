'use client';

import * as React from 'react';
import { Heart, MessageCircle, Share2, Eye, Trash2, Loader2 } from 'lucide-react';
import { useToggleReelLike, useDeleteReel } from '@/hooks/useReels';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReelItem } from '@/lib/types';

interface ReelActionsProps {
  reel: ReelItem;
  isOwn: boolean;
  onOpenComments: () => void;
}

export function ReelActions({ reel, isOwn, onOpenComments }: ReelActionsProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const toggleLike = useToggleReelLike();
  const deleteReel = useDeleteReel();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike.mutate({ reelId: reel.id, likedByMe: reel.likedByMe });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/reels/${reel.id}` : `/reels/${reel.id}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      toast({
        title: 'Link copied',
        description: 'Reel link copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Share link ready',
        description: shareUrl,
      });
    }
  };

  const handleDelete = async () => {
    await deleteReel.mutateAsync(reel.id);
    setConfirmDeleteOpen(false);
  };

  return (
    <>
      <div
        className="flex flex-col items-center gap-4 text-white z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Like button */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleLike}
            data-testid="reel-like-btn"
            aria-label={reel.likedByMe ? 'Unlike reel' : 'Like reel'}
            className="p-2.5 rounded-full bg-black/45 hover:bg-black/65 transition-colors backdrop-blur-sm"
          >
            <Heart
              className={cn(
                'w-6 h-6 transition-transform',
                reel.likedByMe ? 'fill-red-500 text-red-500 scale-110' : 'text-white'
              )}
            />
          </button>
          <span
            data-testid="reel-like-count"
            className="text-xs font-semibold drop-shadow"
          >
            {reel.likeCount}
          </span>
        </div>

        {/* Comments button */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments();
            }}
            data-testid="reel-comment-btn"
            aria-label="Open comments"
            className="p-2.5 rounded-full bg-black/45 hover:bg-black/65 transition-colors backdrop-blur-sm"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
          <span
            data-testid="reel-comment-count"
            className="text-xs font-semibold drop-shadow"
          >
            {reel.commentCount}
          </span>
        </div>

        {/* View count */}
        <div className="flex flex-col items-center gap-1" title={`${reel.viewCount} views`}>
          <div className="p-2 rounded-full bg-black/35 backdrop-blur-sm">
            <Eye className="w-5 h-5 text-white/90" />
          </div>
          <span
            data-testid="reel-view-count"
            className="text-xs font-medium text-white/90 drop-shadow"
          >
            {reel.viewCount}
          </span>
        </div>

        {/* Share button */}
        <button
          type="button"
          onClick={handleShare}
          data-testid="reel-share-btn"
          aria-label="Copy reel link"
          className="p-2.5 rounded-full bg-black/45 hover:bg-black/65 transition-colors backdrop-blur-sm"
        >
          <Share2 className="w-5 h-5 text-white" />
        </button>

        {/* Delete button (owner only) */}
        {isOwn && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteOpen(true);
            }}
            data-testid="reel-delete-btn"
            aria-label="Delete reel"
            className="p-2.5 rounded-full bg-black/45 hover:bg-destructive/80 transition-colors backdrop-blur-sm"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Reel?</DialogTitle>
            <DialogDescription>
              This reel will be permanently removed from your profile and feeds.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={deleteReel.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteReel.isPending}
              data-testid="confirm-delete-reel-btn"
              className="gap-2"
            >
              {deleteReel.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
