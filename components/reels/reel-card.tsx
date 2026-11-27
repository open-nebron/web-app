'use client';

import * as React from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { normalizeStorageUrl } from '@/lib/utils';
import { VideoPlayer } from './video-player';
import { ReelActions } from './reel-actions';
import { ReelFollowButton } from './reel-follow-button';
import { ReelComments } from './reel-comments';
import { useImpressionBeacon, useViewTracking } from '@/lib/beacons';
import type { AnalyticsSource, ReelItem } from '@/lib/types';

interface ReelCardProps {
  reel: ReelItem;
  index: number;
  isActive: boolean;
  shouldLoad: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  currentUserId?: string;
  impressionSource?: AnalyticsSource;
}

export function ReelCard({
  reel,
  index,
  isActive,
  shouldLoad,
  isMuted,
  onToggleMute,
  currentUserId,
  impressionSource = 'feed',
}: ReelCardProps) {
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [expandedCaption, setExpandedCaption] = React.useState(false);
  const loopsCountRef = React.useRef(0);

  const isOwn = Boolean(currentUserId && currentUserId === reel.authorId);

  const impressionRef = useImpressionBeacon<HTMLDivElement>(
    'reel',
    reel.id,
    impressionSource,
    isActive || shouldLoad
  );
  const viewTracking = useViewTracking('reel', reel.id, {
    active: isActive,
    source: impressionSource,
    totalSeconds: reel.duration || 0,
  });

  React.useEffect(() => {
    loopsCountRef.current = 0;
  }, [reel.id, isActive]);

  const handleVideoProgress = React.useCallback(
    (currentTime: number, dur: number) => {
      const effectiveDur = dur > 0 ? dur : reel.duration || 0;
      const cumulative = loopsCountRef.current * effectiveDur + currentTime;
      viewTracking.reportProgress(cumulative, currentTime, effectiveDur);
      if (effectiveDur > 0 && currentTime / effectiveDur >= 0.9) {
        viewTracking.markCompleted();
      }
    },
    [reel.duration, viewTracking]
  );

  const handleLoopComplete = React.useCallback(() => {
    loopsCountRef.current += 1;
    viewTracking.markCompleted();
    if (loopsCountRef.current >= 1) {
      viewTracking.reportReplay();
    }
  }, [viewTracking]);

  return (
    <div
      ref={impressionRef}
      data-testid={`reel-card-${reel.id}`}
      data-reel-id={reel.id}
      data-reel-index={index}
      data-active={String(isActive)}
      className="snap-start h-[calc(100vh-1.5rem)] min-h-[560px] w-full flex items-center justify-center py-2 px-2 shrink-0"
    >
      <div className="relative h-full w-full max-w-[430px] rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10">
        <VideoPlayer
          videoUrl={reel.videoUrl}
          thumbnailUrl={reel.thumbnailUrl}
          isActive={isActive}
          shouldLoad={shouldLoad}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          onProgress={handleVideoProgress}
          onUserPauseChange={viewTracking.setPaused}
          onLoopComplete={handleLoopComplete}
        />

        {/* Gradient legibility overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/85 via-black/35 to-transparent pointer-events-none z-10" />

        {/* Bottom metadata + action rail */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-4 flex items-end justify-between gap-3 pointer-events-none">
          {/* Left side: author info & caption */}
          <div className="flex-1 min-w-0 text-white pointer-events-auto space-y-2.5 pr-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href={`/${reel.author.username}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 min-w-0 hover:opacity-90"
              >
                <Avatar className="h-9 w-9 border border-white/30">
                  <AvatarImage
                    src={
                      reel.author.avatarUrl
                        ? normalizeStorageUrl(reel.author.avatarUrl)
                        : undefined
                    }
                  />
                  <AvatarFallback className="bg-zinc-800 text-white text-xs">
                    {(reel.author.name || reel.author.username || 'U')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-semibold truncate drop-shadow">
                  @{reel.author.username}
                </span>
              </Link>

              {!isOwn && (
                <ReelFollowButton
                  userId={reel.authorId}
                  initialIsFollowing={reel.author.isFollowing}
                />
              )}
            </div>

            {reel.caption && (
              <p
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedCaption((prev) => !prev);
                }}
                className={`text-sm text-white/95 drop-shadow cursor-pointer ${
                  expandedCaption ? 'whitespace-pre-line' : 'line-clamp-2'
                }`}
              >
                {reel.caption}
              </p>
            )}
          </div>

          {/* Right side: interaction bar */}
          <div className="pointer-events-auto">
            <ReelActions
              reel={reel}
              isOwn={isOwn}
              onOpenComments={() => setCommentsOpen(true)}
            />
          </div>
        </div>
      </div>

      <ReelComments
        reelId={reel.id}
        reelAuthorId={reel.authorId}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
    </div>
  );
}
