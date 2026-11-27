'use client';

import * as React from 'react';
import { Volume2, VolumeX, Play, RotateCcw, AlertCircle } from 'lucide-react';
import { normalizeStorageUrl } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  isActive: boolean;
  shouldLoad: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onUserPauseChange?: (paused: boolean) => void;
  onLoopComplete?: () => void;
  className?: string;
}

export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  isActive,
  shouldLoad,
  isMuted,
  onToggleMute,
  onProgress,
  onUserPauseChange,
  onLoopComplete,
  className,
}: VideoPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const prevTimeRef = React.useRef(0);
  const [userPaused, setUserPaused] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const normalizedVideoUrl = React.useMemo(() => normalizeStorageUrl(videoUrl), [videoUrl]);
  const normalizedPosterUrl = React.useMemo(
    () => (thumbnailUrl ? normalizeStorageUrl(thumbnailUrl) : undefined),
    [thumbnailUrl]
  );

  // Reset manual pause when card scrolls out of view
  React.useEffect(() => {
    if (!isActive) {
      setUserPaused(false);
      onUserPauseChange?.(false);
      prevTimeRef.current = 0;
    }
  }, [isActive, onUserPauseChange]);

  // Synchronize play/pause with IntersectionObserver active state
  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    el.muted = isMuted;

    if (isActive && shouldLoad && !userPaused && !hasError) {
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay blocked unless muted — keep muted fallback
          if (!el.muted) {
            el.muted = true;
            el.play().catch(() => {});
          }
        });
      }
    } else {
      el.pause();
    }
  }, [isActive, shouldLoad, userPaused, isMuted, hasError]);

  const handleTogglePlay = () => {
    if (hasError) return;
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      setUserPaused(false);
      onUserPauseChange?.(false);
      el.play().catch(() => {});
    } else {
      setUserPaused(true);
      onUserPauseChange?.(true);
      el.pause();
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    const el = videoRef.current;
    if (el) {
      el.load();
      if (isActive) {
        el.play().catch(() => {});
      }
    }
  };

  return (
    <div
      className={cn('relative w-full h-full bg-black select-none', className)}
      onClick={handleTogglePlay}
    >
      <video
        ref={videoRef}
        src={shouldLoad ? normalizedVideoUrl : undefined}
        poster={normalizedPosterUrl}
        preload="metadata"
        playsInline
        loop
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
          if (prevTimeRef.current > 2 && el.currentTime < 1 && prevTimeRef.current - el.currentTime > 1.5) {
            onLoopComplete?.();
          }
          prevTimeRef.current = el.currentTime;
          onProgress?.(el.currentTime, dur);
        }}
        onEnded={() => onLoopComplete?.()}
        onError={() => {
          if (shouldLoad) setHasError(true);
        }}
        data-testid="reel-video-player"
        data-playing={String(isPlaying && isActive)}
        className="w-full h-full object-cover"
      />

      {/* Mute / Unmute toggle button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
        data-testid="reel-mute-toggle"
        aria-label={isMuted ? 'Unmute video' : 'Mute video'}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors backdrop-blur-sm"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Paused overlay indicator */}
      {isActive && userPaused && !hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="p-4 rounded-full bg-black/50 text-white backdrop-blur-sm">
            <Play className="w-10 h-10 fill-white" />
          </div>
        </div>
      )}

      {/* Error fallback UI */}
      {hasError && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 text-white p-6 text-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertCircle className="w-10 h-10 text-destructive" />
          <p className="text-sm font-medium">Video unavailable</p>
          <button
            type="button"
            onClick={handleRetry}
            data-testid="reel-retry-btn"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tap to retry
          </button>
        </div>
      )}
    </div>
  );
}
