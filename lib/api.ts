import { useAuthStore } from './auth-store';
import type {
  AuthUser,
  CheckUsernameResponse,
  ConfirmUploadResponse,
  LoginResponse,
  MetaResponse,
  PresignedUploadSlot,
  RefreshResponse,
  RegisterResponse,
  UserProfile,
} from './types';

export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface FetchOptions extends RequestInit {
  _retry?: boolean;
}

let refreshPromise: Promise<RefreshResponse> | null = null;

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { headers: customHeaders, _retry, ...restOptions } = options;
  const token = useAuthStore.getState().accessToken;

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && !(restOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...restOptions,
      headers,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach server. Please check your connection.');
  }

  // Handle 401 Unauthorized with token refresh
  if (response.status === 401 && !_retry && !path.includes('/refresh/cookie') && !path.includes('/login/cookie')) {
    try {
      if (!refreshPromise) {
        refreshPromise = authApi.refresh().finally(() => {
          refreshPromise = null;
        });
      }

      await refreshPromise;

      // Retry original request with new access token
      return await apiFetch<T>(path, {
        ...options,
        _retry: true,
      });
    } catch {
      useAuthStore.getState().clear();
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login') &&
        !window.location.pathname.startsWith('/register')
      ) {
        window.location.href = '/login';
      }
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    let errorData: unknown = null;
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const json = await response.json();
      errorData = json;
      if (json && typeof json === 'object') {
        const errObj = json as { error?: { message?: string }; message?: string };
        errorMessage = errObj.error?.message || errObj.message || errorMessage;
      }
    } catch {
      // Body not JSON
    }

    throw new ApiError(response.status, errorMessage, errorData);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await apiFetch<LoginResponse>('/api/auth-cookie/login/cookie', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    useAuthStore.getState().setAccessToken(data.accessToken);

    try {
      const meData = await authApi.me();
      useAuthStore.getState().setUser({ userId: meData.userId, email: meData.email });
      useAuthStore.getState().setStatus('authenticated');
    } catch {
      // If /me fails, still authenticated if token present
      useAuthStore.getState().setStatus('authenticated');
    }

    return data;
  },

  async register(email: string, password: string): Promise<RegisterResponse> {
    return apiFetch<RegisterResponse>('/api/auth-cookie/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<void>('/api/auth-cookie/logout/cookie', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      useAuthStore.getState().clear();
    }
  },

  async refresh(): Promise<RefreshResponse> {
    const data = await apiFetch<RefreshResponse>('/api/auth-cookie/refresh/cookie', {
      method: 'POST',
      credentials: 'include',
    });

    useAuthStore.getState().setAccessToken(data.accessToken);
    return data;
  },

  async me(): Promise<AuthUser> {
    return apiFetch<AuthUser>('/api/auth-cookie/me', {
      method: 'GET',
    });
  },
};

export const coreApi = {
  async getProfile(): Promise<UserProfile> {
    return apiFetch<UserProfile>('/api/core/me');
  },

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    return apiFetch<UserProfile>('/api/core/me', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async checkUsername(username: string): Promise<CheckUsernameResponse> {
    return apiFetch<CheckUsernameResponse>(
      `/api/core/username/check?username=${encodeURIComponent(username)}`
    );
  },

  async updateUsername(username: string): Promise<{ username: string }> {
    return apiFetch<{ username: string }>('/api/core/me/username', {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    });
  },

  async getMeta(): Promise<MetaResponse> {
    return apiFetch<MetaResponse>('/api/core/meta');
  },

  // Avatar upload flow
  async requestAvatarUpload(contentType: string, contentLength: number): Promise<PresignedUploadSlot> {
    return apiFetch<PresignedUploadSlot>('/api/core/me/avatar/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentLength }),
    });
  },

  async confirmAvatar(objectKey: string): Promise<ConfirmUploadResponse> {
    return apiFetch<ConfirmUploadResponse>('/api/core/me/avatar/confirm', {
      method: 'POST',
      body: JSON.stringify({ objectKey }),
    });
  },

  async deleteAvatar(): Promise<void> {
    return apiFetch<void>('/api/core/me/avatar', {
      method: 'DELETE',
    });
  },

  // Banner upload flow
  async requestBannerUpload(contentType: string, contentLength: number): Promise<PresignedUploadSlot> {
    return apiFetch<PresignedUploadSlot>('/api/core/me/banner/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType, contentLength }),
    });
  },

  async confirmBanner(objectKey: string): Promise<ConfirmUploadResponse> {
    return apiFetch<ConfirmUploadResponse>('/api/core/me/banner/confirm', {
      method: 'POST',
      body: JSON.stringify({ objectKey }),
    });
  },

  async deleteBanner(): Promise<void> {
    return apiFetch<void>('/api/core/me/banner', {
      method: 'DELETE',
    });
  },

  // Public profile
  async getPublicProfile(username: string): Promise<UserProfile | null> {
    // If backend doesn't implement GET /users/:username yet, return null
    try {
      return await apiFetch<UserProfile>(`/api/core/users/${encodeURIComponent(username)}`);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 404) {
        return null;
      }
      throw err;
    }
  },
};

