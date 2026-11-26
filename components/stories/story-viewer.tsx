'use client';

import * as React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StoryViewersSheet } from './story-viewers-sheet';
import { useStories, useDeleteStory } from '@/hooks/useStories';
import type { StoryGroup } from '@/lib/types';
import { cn, normalizeStorageUrl } from '@/lib/utils';

interface StoryViewerProps {
  groups: StoryGroup[];
  initialGroupIndex: number;
  open: boolean;
  onClose: () => void;
}

export function StoryViewer({
  groups,
  initialGroupIndex,
  open,
  onClose,
}: StoryViewerProps) {
  const { markStoryViewed } = useStories();
  const deleteStoryMutation = useDeleteStory();

  const [groupIndex, setGroupIndex] = React.useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isHolding, setIsHolding] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [viewersOpen, setViewersOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const pointerDownPos = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const lastViewedIdRef = React.useRef<string | null>(null);

  // Sync groupIndex on open
  React.useEffect(() => {
    if (open) {
      const clampedGroup = Math.max(0, Math.min(initialGroupIndex, groups.length - 1));
      setGroupIndex(clampedGroup);
      const targetGroup = groups[clampedGroup];
      // Start at first unviewed story if available
      const firstUnviewed = targetGroup?.stories.findIndex((s) => !s.viewedByMe) ?? 0;
      setStoryIndex(firstUnviewed >= 0 ? firstUnviewed : 0);
      setProgress(0);
      setIsPaused(false);
      setViewersOpen(false);
      setDeleteDialogOpen(false);
    }
  }, [open, initialGroupIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clamp safely if groups update (e.g., story deleted)
  React.useEffect(() => {
    if (!open) return;
    if (groups.length === 0) {
      onClose();
      return;
    }
    const safeGroupIdx = Math.min(groupIndex, groups.length - 1);
    if (safeGroupIdx !== groupIndex) {
      setGroupIndex(safeGroupIdx);
    }
    const grp = groups[safeGroupIdx];
    if (!grp || grp.stories.length === 0) {
      onClose();
      return;
    }
    if (storyIndex >= grp.stories.length) {
      setStoryIndex(grp.stories.length - 1);
      setProgress(0);
    }
  }, [groups, groupIndex, storyIndex, open, onClose]);

  const activeGroup = groups[groupIndex];
  const activeStory = activeGroup?.stories[storyIndex];

  const handleNext = React.useCallback(() => {
    if (!activeGroup) {
      onClose();
      return;
    }
    if (storyIndex + 1 < activeGroup.stories.length) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
    } else if (groupIndex + 1 < groups.length) {
      const nextGroupIdx = groupIndex + 1;
      setGroupIndex(nextGroupIdx);
      const nextGroup = groups[nextGroupIdx];
      const firstUnviewed = nextGroup?.stories.findIndex((s) => !s.viewedByMe) ?? 0;
      setStoryIndex(firstUnviewed >= 0 ? firstUnviewed : 0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [activeGroup, storyIndex, groupIndex, groups, onClose]);

  const handlePrev = React.useCallback(() => {
    if (!activeGroup) return;
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      const prevGroupIdx = groupIndex - 1;
      setGroupIndex(prevGroupIdx);
      const prevGroup = groups[prevGroupIdx];
      setStoryIndex(Math.max(0, (prevGroup?.stories.length ?? 1) - 1));
      setProgress(0);
    } else {
      setProgress(0);
    }
  }, [activeGroup, storyIndex, groupIndex, groups]);

  // Track view idempotently whenever activeStory changes
  React.useEffect(() => {
    if (!open || !activeStory || !activeGroup) return;
    if (lastViewedIdRef.current !== activeStory.id) {
      lastViewedIdRef.current = activeStory.id;
      markStoryViewed(activeStory.id, activeGroup.userId);
    }
  }, [open, activeStory, activeGroup, markStoryViewed]);

  const effectivelyPaused = isPaused || isHolding || viewersOpen || deleteDialogOpen;

  // Auto-advance timer for image stories (or fallback)
  React.useEffect(() => {
    if (!open || !activeStory || effectivelyPaused) return;
    if (activeStory.mediaType === 'video') return;

    const durationMs = Math.max(1, activeStory.duration || 5) * 1000;
    const tickMs = 50;
    const increment = (tickMs / durationMs) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 100) {
          return 100;
        }
        return prev + increment;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [open, activeStory, effectivelyPaused]);

  // Advance when progress reaches 100% on images
  React.useEffect(() => {
    if (open && activeStory?.mediaType !== 'video' && progress >= 100) {
      handleNext();
    }
  }, [open, activeStory, progress, handleNext]);

  // Sync <video> play/pause state
  React.useEffect(() => {
    const vid = videoRef.current;
    if (!vid || activeStory?.mediaType !== 'video') return;
    if (effectivelyPaused) {
      vid.pause();
    } else {
      vid.play().catch(() => {});
    }
  }, [effectivelyPaused, activeStory]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!open || viewersOpen || deleteDialogOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, viewersOpen, deleteDialogOpen, onClose, handleNext, handlePrev]);

  if (!open || !activeGroup || !activeStory) {
    return null;
  }

  const initials = (activeGroup.name || activeGroup.username || 'U').slice(0, 2).toUpperCase();

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    pointerDownPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsHolding(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsHolding(false);
    const start = pointerDownPos.current;
    pointerDownPos.current = null;
    if (!start) return;
    if ((e.target as HTMLElement).closest('button, a')) return;

    const dy = e.clientY - start.y;
    const dx = Math.abs(e.clientX - start.x);
    const elapsed = Date.now() - start.time;

    // Swipe down to close
    if (dy > 80 && dx < 60) {
      onClose();
      return;
    }

    // Short tap left/right to navigate
    if (elapsed < 250 && Math.abs(dy) < 20 && dx < 20) {
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      if (relX < rect.width * 0.3) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  const handleDeleteConfirm = async () => {
    const idToDelete = activeStory.id;
    await deleteStoryMutation.mutateAsync(idToDelete);
    setDeleteDialogOpen(false);
    if (activeGroup.stories.length <= 1) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/95 text-white flex items-center justify-center select-none"
      data-testid="story-viewer-modal"
    >
      {/* Desktop previous group/story button */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Previous story"
        className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white mr-4 transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Story Canvas Container */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setIsHolding(false);
          pointerDownPos.current = null;
        }}
        className="relative w-full h-full sm:w-[420px] sm:h-[85vh] sm:max-h-[780px] sm:rounded-2xl overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-2xl border border-white/10 touch-pan-x"
      >
        {/* Top Overlay: Progress Bars + Header */}
        <div className="relative z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3.5 pt-3 space-y-3">
          {/* Progress segments */}
          <div className="flex items-center gap-1" data-testid="story-progress-bars">
            {activeGroup.stories.map((st, idx) => {
              const barWidth =
                idx < storyIndex ? '100%' : idx === storyIndex ? `${progress}%` : '0%';
              return (
                <div
                  key={st.id}
                  className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-[width] duration-75 ease-linear"
                    style={{ width: barWidth }}
                  />
                </div>
              );
            })}
          </div>

          {/* Author Info & Controls */}
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/${activeGroup.username}`}
              onClick={onClose}
              className="flex items-center gap-2.5 min-w-0"
            >
              <Avatar className="w-8 h-8 border border-white/30">
                {activeGroup.avatarUrl && (
                  <AvatarImage
                    src={normalizeStorageUrl(activeGroup.avatarUrl)}
                    alt={activeGroup.username}
                  />
                )}
                <AvatarFallback className="text-xs bg-zinc-800 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">
                    {activeGroup.isMine ? 'Your story' : activeGroup.name || activeGroup.username}
                  </span>
                  <span className="text-[11px] text-white/70 shrink-0">
                    {formatDistanceToNow(new Date(activeStory.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-[11px] text-white/70 truncate">@{activeGroup.username}</p>
              </div>
            </Link>

            <div className="flex items-center gap-1 shrink-0">
              {activeStory.mediaType === 'video' && (
                <button
                  type="button"
                  onClick={() => setIsMuted((m) => !m)}
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                aria-label={effectivelyPaused ? 'Resume story' : 'Pause story'}
                className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
              >
                {effectivelyPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>

              {activeGroup.isMine && (
                <button
                  type="button"
                  onClick={() => setDeleteDialogOpen(true)}
                  aria-label="Delete story"
                  data-testid="delete-story-btn"
                  className="p-1.5 rounded-full hover:bg-red-500/30 text-white/90 hover:text-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close story viewer"
                data-testid="close-story-viewer-btn"
                className="p-1.5 rounded-full hover:bg-white/15 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Media Content */}
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          {activeStory.mediaType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={normalizeStorageUrl(activeStory.mediaUrl)}
              alt={activeStory.caption || 'Story'}
              className="w-full h-full object-contain pointer-events-none"
            />
          ) : (
            <video
              ref={videoRef}
              key={activeStory.id}
              src={normalizeStorageUrl(activeStory.mediaUrl)}
              autoPlay
              playsInline
              muted={isMuted}
              onTimeUpdate={(e) => {
                const vid = e.currentTarget;
                const dur = Number.isFinite(vid.duration) && vid.duration > 0
                  ? vid.duration
                  : activeStory.duration || 15;
                setProgress(Math.min(100, (vid.currentTime / dur) * 100));
              }}
              onEnded={handleNext}
              className="w-full h-full object-contain pointer-events-none"
            />
          )}
        </div>

        {/* Bottom Overlay: Caption + Author Viewers Button */}
        <div
          className={cn(
            'relative z-20 p-4 pt-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent space-y-3',
            !activeStory.caption && !activeGroup.isMine && 'pointer-events-none'
          )}
        >
          {activeStory.caption && (
            <p className="text-sm text-white/95 text-center leading-snug drop-shadow px-2">
              {activeStory.caption}
            </p>
          )}

          {activeGroup.isMine && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setViewersOpen(true)}
                data-testid="story-viewers-trigger"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-xs font-medium transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>
                  {activeStory.viewerCount ?? 0}{' '}
                  {(activeStory.viewerCount ?? 0) === 1 ? 'viewer' : 'viewers'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop next group/story button */}
      <button
        type="button"
        onClick={handleNext}
        aria-label="Next story"
        className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white ml-4 transition-colors"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Author-only Viewers Sheet */}
      {activeGroup.isMine && (
        <StoryViewersSheet
          storyId={activeStory.id}
          open={viewersOpen}
          onOpenChange={setViewersOpen}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm z-[60]">
          <DialogHeader>
            <DialogTitle>Delete story?</DialogTitle>
            <DialogDescription>
              This story will be permanently removed and your followers will no longer see it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteStoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={deleteStoryMutation.isPending}
              data-testid="confirm-delete-story-btn"
              className="gap-1.5"
            >
              {deleteStoryMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Delete</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
