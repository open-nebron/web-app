'use client';

import * as React from 'react';
import Link from 'next/link';
import { Film, Loader2, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReelsFeed, useRecordReelView } from '@/hooks/useReels';
import { useProfile } from '@/hooks/use-profile';
import { ReelCard } from './reel-card';
import type { ReelItem } from '@/lib/types';

interface ReelsFeedProps {
  initialReel?: ReelItem | null;
  onOpenUploader?: () => void;
}

export function ReelsFeed({ initialReel, onOpenUploader }: ReelsFeedProps) {
  const { data: myProfile } = useProfile();
  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useReelsFeed();

  const recordView = useRecordReelView();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isMuted, setIsMuted] = React.useState(true);

  const reels = React.useMemo(() => {
    const feedItems = data?.pages.flatMap((p) => p.items) ?? [];
    if (!initialReel) return feedItems;
    return [initialReel, ...feedItems.filter((item) => item.id !== initialReel.id)];
  }, [data, initialReel]);

  // IntersectionObserver tracks which reel occupies >= 65% of the viewport
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || reels.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            const idxAttr = entry.target.getAttribute('data-reel-index');
            if (idxAttr !== null) {
              const idx = Number.parseInt(idxAttr, 10);
              if (Number.isFinite(idx)) {
                setActiveIndex(idx);
              }
            }
          }
        }
      },
      {
        root: container,
        threshold: [0.65],
      }
    );

    const children = container.querySelectorAll('[data-reel-index]');
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [reels.length]);

  // Debounced per-session view tracking
  React.useEffect(() => {
    const activeReel = reels[activeIndex];
    if (!activeReel) return;

    const timer = setTimeout(() => {
      recordView(activeReel.id);
    }, 600);

    return () => clearTimeout(timer);
  }, [activeIndex, reels, recordView]);

  // Prefetch next page when user nears the end of loaded items
  React.useEffect(() => {
    if (
      reels.length > 0 &&
      activeIndex >= reels.length - 3 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [activeIndex, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading && reels.length === 0) {
    return (
      <div className="h-[calc(100vh-2rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div
        data-testid="reels-empty-state"
        className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-6 gap-4"
      >
        <div className="p-4 rounded-full bg-muted">
          <Film className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h2 className="text-lg font-semibold">No reels yet</h2>
          <p className="text-sm text-muted-foreground">
            Follow creators or upload your own short vertical video reel (5-60s MP4).
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onOpenUploader && (
            <Button onClick={onOpenUploader} data-testid="empty-upload-reel-btn">
              Upload Reel
            </Button>
          )}
          <Button asChild variant="outline">
            <Link href="/explore">
              <Compass className="w-4 h-4 mr-2" />
              Explore Creators
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="reels-feed-container"
      className="h-[calc(100vh-1rem)] overflow-y-scroll snap-y snap-mandatory scroll-smooth"
    >
      {reels.map((reel, index) => (
        <ReelCard
          key={reel.id}
          reel={reel}
          index={index}
          isActive={index === activeIndex}
          shouldLoad={Math.abs(index - activeIndex) <= 1}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted((m) => !m)}
          currentUserId={myProfile?.userId}
        />
      ))}

      {isFetchingNextPage && (
        <div className="py-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
