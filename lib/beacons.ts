'use client';

import * as React from 'react';
import { analyticsApi } from '@/lib/analytics-api';
import { useAuthStore } from '@/lib/auth-store';
import type { AnalyticsContentType, AnalyticsSource } from '@/lib/types';

const sessionImpressionKeys = new Set<string>();
const recentProfileVisitTimestamps = new Map<string, number>();

export function makeImpressionSessionKey(
  contentType: AnalyticsContentType,
  contentId: string
): string {
  return `${contentType}:${contentId}`;
}

/**
 * Checks whether an impression has already been dispatched for this content item in the current browser session.
 */
export function shouldSendImpression(
  contentType: AnalyticsContentType,
  contentId: string,
  memorySet: Set<string> = sessionImpressionKeys
): boolean {
  if (!contentId) return false;
  const key = makeImpressionSessionKey(contentType, contentId);
  if (memorySet.has(key)) return false;

  if (typeof window !== 'undefined') {
    try {
      const storageKey = `nebron:imp:${key}`;
      if (window.sessionStorage.getItem(storageKey) === '1') {
        memorySet.add(key);
        return false;
      }
      window.sessionStorage.setItem(storageKey, '1');
    } catch {
      // Ignore storage access restrictions
    }
  }

  memorySet.add(key);
  return true;
}

/**
 * Fires a single impression beacon per session when >=50% of the element becomes visible in the viewport.
 */
export function useImpressionBeacon<T extends HTMLElement = HTMLDivElement>(
  contentType: AnalyticsContentType,
  contentId: string | undefined,
  source: AnalyticsSource = 'feed',
  enabled: boolean = true
): React.RefObject<T> {
  const ref = React.useRef<T>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = status === 'authenticated' && Boolean(accessToken);

  React.useEffect(() => {
    const el = ref.current;
    if (!enabled || !contentId || !isAuthenticated || !el) return;

    if (sessionImpressionKeys.has(makeImpressionSessionKey(contentType, contentId))) {
      return;
    }

    const trigger = () => {
      if (shouldSendImpression(contentType, contentId)) {
        analyticsApi.recordImpression({ contentType, contentId, source }).catch(() => {});
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      trigger();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            trigger();
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [contentType, contentId, source, enabled, isAuthenticated]);

  return ref;
}

export interface UseViewTrackingOptions {
  active: boolean;
  source?: string;
  totalSeconds?: number;
  enabled?: boolean;
}

export interface ViewTrackingControls {
  reportProgress: (watchedSeconds: number, currentPosition?: number, totalSeconds?: number) => void;
  setPaused: (paused: boolean) => void;
  markCompleted: () => void;
  markExited: () => void;
  reportTapForward: () => void;
  reportTapBack: () => void;
  reportReplay: () => void;
}

/**
 * Tracks a reel or story view session from start through 5s heartbeats until completion or unmount/exit.
 */
export function useViewTracking(
  contentType: 'reel' | 'story',
  contentId: string | undefined,
  options: UseViewTrackingOptions
): ViewTrackingControls {
  const { active, source = 'feed', totalSeconds = 0, enabled = true } = options;
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);
  const isAuthenticated = status === 'authenticated' && Boolean(accessToken);

  const stateRef = React.useRef({
    viewId: null as string | null,
    watchedSeconds: 0,
    currentPosition: 0,
    totalSeconds,
    lastTickMs: Date.now(),
    isPaused: false,
    completed: false,
    exited: false,
    replayed: false,
    tapsForward: 0,
    tapsBack: 0,
    ended: false,
  });

  stateRef.current.totalSeconds = totalSeconds || stateRef.current.totalSeconds;

  const syncElapsedWatchTime = React.useCallback(() => {
    const st = stateRef.current;
    const now = Date.now();
    if (!st.isPaused) {
      const delta = (now - st.lastTickMs) / 1000;
      if (delta > 0 && delta < 30) {
        st.watchedSeconds = Number((st.watchedSeconds + delta).toFixed(2));
      }
    }
    st.lastTickMs = now;
  }, []);

  React.useEffect(() => {
    if (!active || !enabled || !contentId || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    const st = stateRef.current;
    st.viewId = null;
    st.watchedSeconds = 0;
    st.currentPosition = 0;
    st.totalSeconds = totalSeconds;
    st.lastTickMs = Date.now();
    st.isPaused = false;
    st.completed = false;
    st.exited = false;
    st.replayed = false;
    st.tapsForward = 0;
    st.tapsBack = 0;
    st.ended = false;

    const sessionId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const flushEnd = (explicitViewId?: string | null) => {
      const vid = explicitViewId ?? stateRef.current.viewId;
      if (!vid || stateRef.current.ended) return;
      stateRef.current.ended = true;
      if (!useAuthStore.getState().accessToken) return;
      syncElapsedWatchTime();
      const s = stateRef.current;
      analyticsApi
        .endView({
          viewId: vid,
          watchedSeconds: s.watchedSeconds,
          completed: s.completed,
          tapsForward: s.tapsForward,
          tapsBack: s.tapsBack,
          exited: s.exited,
          replayed: s.replayed,
        })
        .catch(() => {});
    };

    analyticsApi
      .startView({
        contentType,
        contentId,
        source,
        sessionId,
        totalSeconds: totalSeconds > 0 ? totalSeconds : undefined,
      })
      .then((res) => {
        if (cancelled) {
          flushEnd(res.viewId);
          return;
        }
        stateRef.current.viewId = res.viewId;
      })
      .catch(() => {});

    const interval = window.setInterval(() => {
      if (cancelled || stateRef.current.ended) return;
      syncElapsedWatchTime();
      const s = stateRef.current;
      if (!s.viewId || s.isPaused || !useAuthStore.getState().accessToken) return;
      analyticsApi
        .heartbeatView({
          viewId: s.viewId,
          watchedSeconds: s.watchedSeconds,
          currentPosition: s.currentPosition > 0 ? s.currentPosition : undefined,
          tapsForward: s.tapsForward > 0 ? s.tapsForward : undefined,
          tapsBack: s.tapsBack > 0 ? s.tapsBack : undefined,
        })
        .catch(() => {});
    }, 5000);

    const handlePageHide = () => {
      flushEnd();
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('pagehide', handlePageHide);
      flushEnd();
    };
  }, [active, enabled, contentType, contentId, source, isAuthenticated, syncElapsedWatchTime, totalSeconds]);

  return React.useMemo<ViewTrackingControls>(
    () => ({
      reportProgress: (watchedSeconds: number, currentPosition?: number, totalSec?: number) => {
        const st = stateRef.current;
        if (watchedSeconds > st.watchedSeconds) {
          st.watchedSeconds = Number(watchedSeconds.toFixed(2));
        }
        if (typeof currentPosition === 'number') {
          st.currentPosition = currentPosition;
        }
        if (typeof totalSec === 'number' && totalSec > 0) {
          st.totalSeconds = totalSec;
        }
        st.lastTickMs = Date.now();
      },
      setPaused: (paused: boolean) => {
        if (stateRef.current.isPaused !== paused) {
          syncElapsedWatchTime();
          stateRef.current.isPaused = paused;
        }
      },
      markCompleted: () => {
        stateRef.current.completed = true;
        stateRef.current.exited = false;
      },
      markExited: () => {
        if (!stateRef.current.completed) {
          stateRef.current.exited = true;
        }
      },
      reportTapForward: () => {
        stateRef.current.tapsForward += 1;
      },
      reportTapBack: () => {
        stateRef.current.tapsBack += 1;
      },
      reportReplay: () => {
        stateRef.current.replayed = true;
      },
    }),
    [syncElapsedWatchTime]
  );
}

/**
 * Records a profile visit once when mounting another creator's profile page.
 */
export function useProfileVisitBeacon(visitedUserId: string | undefined, selfUserId?: string) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const currentUserId = selfUserId || user?.userId;

  React.useEffect(() => {
    if (!visitedUserId || status !== 'authenticated' || !accessToken) return;
    if (currentUserId && currentUserId === visitedUserId) return;

    const now = Date.now();
    const lastSent = recentProfileVisitTimestamps.get(visitedUserId) ?? 0;
    if (now - lastSent < 5000) return;

    recentProfileVisitTimestamps.set(visitedUserId, now);
    analyticsApi.recordProfileVisit(visitedUserId).catch(() => {});
  }, [visitedUserId, currentUserId, accessToken, status]);
}
