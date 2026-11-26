import { apiFetch } from './api';
import { normalizeStorageUrl } from './utils';
import type {
  PresignedUploadSlot,
  StoriesFeedResponse,
  StoryGroup,
  StoryItem,
  StoryMediaType,
  StoryViewersResponse,
} from './types';

export const storiesApi = {
  async getUploadUrl(contentType: string, contentLength: number): Promise<PresignedUploadSlot> {
    return apiFetch<PresignedUploadSlot>('/api/core/stories/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentLength }),
    });
  },

  async uploadStoryFile(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<PresignedUploadSlot> {
    const slot = await this.getUploadUrl(file.type, file.size);
    const uploadUrl = normalizeStorageUrl(slot.uploadUrl);

    const formData = new FormData();
    if (slot.fields) {
      Object.entries(slot.fields).forEach(([k, v]) => {
        formData.append(k, v);
      });
    }
    formData.append('file', file);

    if (onProgress && typeof XMLHttpRequest !== 'undefined') {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Storage upload network error'));
        xhr.send(formData);
      });
    } else {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`Storage upload failed with status ${res.status}`);
      }
    }

    return slot;
  },

  async confirmStory(payload: {
    objectKey: string;
    mediaType: StoryMediaType;
    duration?: number;
    caption?: string | null;
    thumbnailKey?: string | null;
  }): Promise<StoryItem> {
    return apiFetch<StoryItem>('/api/core/stories/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getStories(): Promise<StoriesFeedResponse> {
    return apiFetch<StoriesFeedResponse>('/api/core/stories');
  },

  async getUserStories(userId: string): Promise<StoryGroup> {
    return apiFetch<StoryGroup>(`/api/core/stories/${encodeURIComponent(userId)}`);
  },

  async viewStory(storyId: string): Promise<void> {
    return apiFetch<void>(`/api/core/stories/${encodeURIComponent(storyId)}/view`, {
      method: 'POST',
    });
  },

  async deleteStory(storyId: string): Promise<void> {
    return apiFetch<void>(`/api/core/stories/${encodeURIComponent(storyId)}`, {
      method: 'DELETE',
    });
  },

  async getStoryViewers(storyId: string): Promise<StoryViewersResponse> {
    return apiFetch<StoryViewersResponse>(`/api/core/stories/${encodeURIComponent(storyId)}/viewers`);
  },
};
