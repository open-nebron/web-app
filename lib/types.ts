export type UserTheme = 'light' | 'dark' | 'system';
export type MessageRequestPolicy = 'everyone' | 'known' | 'nobody';
export type PrivacyVisibility = 'everyone' | 'contacts' | 'nobody';

export interface UserPrivacy {
  showOnlineStatus: PrivacyVisibility;
  showLastSeen: PrivacyVisibility;
  sendReadReceipts: boolean;
}

export interface AuthUser {
  userId: string;
  email: string;
  sessionId?: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  userId: string;
}

export interface UserProfile {
  userId: string;
  username: string;
  name: string | null;
  dateOfBirth: string | null;
  about: string | null;
  bio: string | null;
  language: string;
  theme: UserTheme;
  avatarUrl: string | null;
  bannerUrl: string | null;
  messageRequestPolicy?: MessageRequestPolicy;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  isFollowingViewer?: boolean;
  isFollowedByViewer?: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface PostAuthor {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Post {
  id: string;
  body: string;
  imageKey?: string | null;
  imageUrl?: string | null;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  createdAt: string;
  author: PostAuthor;
}

export interface UserFollowItem {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  isFollowingViewer: boolean;
}

export interface UserSuggestionItem {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  followerCount: number;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export interface MetaLimits {
  avatarMaxBytes: number;
  bannerMaxBytes: number;
  bioMaxChars: number;
  aboutMaxChars: number;
  nameMaxChars: number;
}

export interface MetaResponse {
  languages: LanguageOption[];
  themes: UserTheme[];
  defaultLanguage: string;
  limits: MetaLimits;
  acceptedImageTypes: string[];
}

export interface CheckUsernameResponse {
  available: boolean;
  reason?: 'taken' | 'reserved' | 'invalid_format';
}

export interface PresignedUploadSlot {
  uploadUrl: string;
  fields: Record<string, string>;
  objectKey: string;
  expiresAt: string;
  maxBytes: number;
}

export interface ConfirmUploadResponse {
  key: string;
  url: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

