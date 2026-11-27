import { apiFetch } from './api';
import { normalizeStorageUrl } from './utils';
import type {
  PresignedUploadSlot,
  ReelCommentItem,
  ReelItem,
  ReelLikerItem,
  ReelsFeedResponse,
} from './types';

export const MAX_REEL_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
export const MAX_REEL_THUMBNAIL_BYTES = 5 * 1024 * 1024; // 5MB
export const MIN_REEL_DURATION_SECONDS = 5;
export const MAX_REEL_DURATION_SECONDS = 60;
export const VIEWED_REELS_STORAGE_KEY = 'viewed_reels';

export function validateReelVideoFile(file: { type: string; size: number }): string | null {
  if (file.type !== 'video/mp4') {
    return 'Reels currently support MP4 videos (video/mp4) only.';
  }
  if (file.size < 1) {
    return 'Selected video file is empty.';
  }
  if (file.size > MAX_REEL_VIDEO_BYTES) {
    return 'Reel videos must be 50MB or smaller.';
  }
  return null;
}

export function validateReelDuration(durationSeconds: number): string | null {
  if (!Number.isFinite(durationSeconds)) {
    return 'Could not determine video duration.';
  }
  if (durationSeconds < MIN_REEL_DURATION_SECONDS) {
    return `Reel must be at least ${MIN_REEL_DURATION_SECONDS} seconds long.`;
  }
  if (durationSeconds > MAX_REEL_DURATION_SECONDS) {
    return `Reel cannot exceed ${MAX_REEL_DURATION_SECONDS} seconds.`;
  }
  return null;
}

export function hasViewedReelInSession(reelId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.sessionStorage.getItem(VIEWED_REELS_STORAGE_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as unknown;
    return Array.isArray(ids) && ids.includes(reelId);
  } catch {
    return false;
  }
}

export function markReelViewedInSession(reelId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(VIEWED_REELS_STORAGE_KEY);
    const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!Array.isArray(ids)) {
      window.sessionStorage.setItem(VIEWED_REELS_STORAGE_KEY, JSON.stringify([reelId]));
      return;
    }
    if (!ids.includes(reelId)) {
      ids.push(reelId);
      window.sessionStorage.setItem(VIEWED_REELS_STORAGE_KEY, JSON.stringify(ids));
    }
  } catch {
    // Non-blocking if storage is restricted
  }
}

export function supportsWebCodecs(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof (window as any).VideoEncoder === 'function' &&
    typeof (window as any).VideoDecoder === 'function'
  );
}

/**
 * Generates an optional PNG poster thumbnail from an MP4 File via HTML5 video + canvas.
 * Non-blocking: returns null if browser codec/canvas cannot capture cleanly.
 */
export async function extractVideoThumbnail(file: File): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<Blob | null>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = objectUrl;

      const timeout = setTimeout(() => resolve(null), 2500);

      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(0.5, video.duration > 0 ? video.duration / 4 : 0);
        } catch {
          clearTimeout(timeout);
          resolve(null);
        }
      };

      video.onseeked = () => {
        clearTimeout(timeout);
        try {
          const width = Math.min(720, video.videoWidth || 720);
          const height =
            video.videoWidth && video.videoHeight
              ? Math.round((width / video.videoWidth) * video.videoHeight)
              : 1280;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82);
        } catch {
          resolve(null);
        }
      };

      video.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
  }
}

export async function uploadToPresignedSlot(
  slot: PresignedUploadSlot,
  file: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<PresignedUploadSlot> {
  if (signal?.aborted) {
    throw new DOMException('Upload aborted', 'AbortError');
  }

  const uploadUrl = normalizeStorageUrl(slot.uploadUrl);
  const formData = new FormData();
  if (slot.fields) {
    Object.entries(slot.fields).forEach(([k, v]) => {
      formData.append(k, v);
    });
  }
  formData.append('file', file, file instanceof File ? file.name : 'upload');

  if (typeof XMLHttpRequest !== 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);

      const onAbort = () => {
        xhr.abort();
        reject(new DOMException('Upload cancelled', 'AbortError'));
      };
      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        signal?.removeEventListener('abort', onAbort);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Storage upload failed with status ${xhr.status} (${contentType})`));
        }
      };

      xhr.onerror = () => {
        signal?.removeEventListener('abort', onAbort);
        reject(new Error('Storage upload network error'));
      };

      xhr.send(formData);
    });
  } else {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      signal,
    });
    if (!res.ok) {
      throw new Error(`Storage upload failed with status ${res.status}`);
    }
  }

  return slot;
}

export const reelsApi = {
  async getUploadUrl(contentType: 'video/mp4', contentLength: number): Promise<PresignedUploadSlot> {
    return apiFetch<PresignedUploadSlot>('/api/core/reels/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentLength }),
    });
  },

  async getThumbnailUploadUrl(
    contentType: 'image/jpeg' | 'image/png' | 'image/webp',
    contentLength: number
  ): Promise<PresignedUploadSlot> {
    return apiFetch<PresignedUploadSlot>('/api/core/reels/thumbnail/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentLength }),
    });
  },

  async uploadReelVideo(
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ): Promise<PresignedUploadSlot> {
    const slot = await this.getUploadUrl('video/mp4', file.size);
    return uploadToPresignedSlot(slot, file, 'video/mp4', onProgress, signal);
  },

  async uploadReelThumbnail(
    blob: Blob,
    signal?: AbortSignal
  ): Promise<PresignedUploadSlot> {
    const mime =
      blob.type === 'image/png' || blob.type === 'image/webp' || blob.type === 'image/jpeg'
        ? blob.type
        : 'image/jpeg';
    const slot = await this.getThumbnailUploadUrl(mime, blob.size);
    return uploadToPresignedSlot(slot, blob, mime, undefined, signal);
  },

  async confirmReel(payload: {
    videoKey: string;
    thumbnailKey?: string | null;
    caption?: string | null;
    duration: number;
  }): Promise<ReelItem> {
    return apiFetch<ReelItem>('/api/core/reels/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getFeedReels(cursor?: string, limit: number = 10): Promise<ReelsFeedResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return apiFetch<ReelsFeedResponse>(`/api/core/reels?${params.toString()}`);
  },

  async getUserReels(userId: string, cursor?: string, limit: number = 12): Promise<ReelsFeedResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return apiFetch<ReelsFeedResponse>(
      `/api/core/users/${encodeURIComponent(userId)}/reels?${params.toString()}`
    );
  },

  async getMyReels(cursor?: string, limit: number = 12): Promise<ReelsFeedResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set('cursor', cursor);
    return apiFetch<ReelsFeedResponse>(`/api/core/users/me/reels?${params.toString()}`);
  },

  async getReelById(id: string): Promise<ReelItem> {
    return apiFetch<ReelItem>(`/api/core/reels/${encodeURIComponent(id)}`);
  },

  async recordView(id: string): Promise<void> {
    await apiFetch<{ status: string }>(`/api/core/reels/${encodeURIComponent(id)}/view`, {
      method: 'POST',
    });
  },

  async likeReel(id: string): Promise<{ liked: boolean; likeCount: number }> {
    return apiFetch<{ liked: boolean; likeCount: number }>(
      `/api/core/reels/${encodeURIComponent(id)}/like`,
      { method: 'POST' }
    );
  },

  async unlikeReel(id: string): Promise<{ liked: boolean; likeCount: number }> {
    return apiFetch<{ liked: boolean; likeCount: number }>(
      `/api/core/reels/${encodeURIComponent(id)}/like`,
      { method: 'DELETE' }
    );
  },

  async getReelLikes(id: string, limit: number = 30, before?: string): Promise<ReelLikerItem[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before);
    return apiFetch<ReelLikerItem[]>(
      `/api/core/reels/${encodeURIComponent(id)}/likes?${params.toString()}`
    );
  },

  async getComments(
    reelId: string,
    limit: number = 30,
    before?: string,
    sort?: 'top' | 'new'
  ): Promise<ReelCommentItem[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set('before', before);
    if (sort) params.set('sort', sort);
    return apiFetch<ReelCommentItem[]>(
      `/api/core/reels/${encodeURIComponent(reelId)}/comments?${params.toString()}`
    );
  },

  async createComment(
    reelId: string,
    body: string,
    parentCommentId?: string | null
  ): Promise<ReelCommentItem> {
    const payload =
      parentCommentId !== undefined && parentCommentId !== null
        ? { body, parentCommentId }
        : { body };
    return apiFetch<ReelCommentItem>(
      `/api/core/reels/${encodeURIComponent(reelId)}/comments`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  async deleteComment(commentId: string): Promise<void> {
    await apiFetch<void>(`/api/core/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
    });
  },

  async deleteReel(id: string): Promise<void> {
    await apiFetch<void>(`/api/core/reels/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
