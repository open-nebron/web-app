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
  isAdmin?: boolean;
  isBanned?: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface PostAuthor {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface CommentAuthor {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface CommentReplyToUser {
  userId: string;
  username: string;
}

export interface CommentParentPreview {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
}

export interface Comment {
  id: string;
  postId?: string;
  reelId?: string;
  targetType?: 'post' | 'reel';
  parentCommentId?: string | null;
  replyToUserId?: string | null;
  replyToUser?: CommentReplyToUser | null;
  body: string;
  likeCount?: number;
  replyCount?: number;
  saveCount?: number;
  shareCount?: number;
  likedByViewer?: boolean;
  savedByViewer?: boolean;
  savedAt?: string;
  pinned?: boolean;
  pinnedAt?: string | null;
  editedAt?: string | null;
  mentions?: string[];
  hashtags?: string[];
  deleted?: boolean;
  createdAt: string;
  author: CommentAuthor;
  topReplies?: Comment[];
  parent?: CommentParentPreview;
}

export interface Post {
  id: string;
  body: string;
  imageKey?: string | null;
  imageUrl?: string | null;
  mentions?: string[];
  hashtags?: string[];
  likeCount: number;
  commentCount: number;
  saveCount?: number;
  shareCount?: number;
  likedByViewer: boolean;
  savedByViewer?: boolean;
  savedAt?: string;
  comments?: Comment[];
  createdAt: string;
  updatedAt?: string | null;
  author: PostAuthor;
}

export type ShareContentType = 'post' | 'reel' | 'comment';

export interface ShareContentResponse {
  url: string;
  shareCount: number;
}

export interface TrendingHashtag {
  tag: string;
  postCount: number;
}

export interface HashtagPostsResponse {
  tag: string;
  postCount: number;
  data: Post[];
  hasMore: boolean;
}

export interface PostImageUploadUrlResponse {
  uploadUrl: string;
  objectKey: string;
  fields?: Record<string, string>;
  expiresAt?: string;
  maxBytes?: number;
  method?: string;
  headers?: Record<string, string>;
  expiresInSeconds?: number;
}

export interface PostImageConfirmResponse {
  verified: boolean;
  objectKey: string;
  url: string;
}

export interface UserFollowItem {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  followerCount?: number;
  isFollowingViewer: boolean;
  isFollowedByViewer?: boolean;
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

export interface SessionDevice {
  browser?: string;
  os?: string;
  deviceType?: string;
  deviceName?: string;
}

export interface SessionItem {
  sessionId: string;
  userAgent?: SessionDevice | string;
  ip?: string;
  lastActiveAt?: string | null;
  createdAt: string;
  isCurrent?: boolean;
  isActive?: boolean;
}

export interface SessionsResponse {
  sessions: SessionItem[];
}

export type StoryMediaType = 'image' | 'video';

export interface StoryItem {
  id: string;
  authorId: string;
  mediaUrl: string;
  mediaType: StoryMediaType;
  thumbnailUrl?: string | null;
  duration: number;
  caption: string | null;
  viewedByMe: boolean;
  viewerCount?: number;
  createdAt: string;
  expiresAt: string;
}

export interface StoryGroup {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  isMine: boolean;
  stories: StoryItem[];
  hasUnviewed: boolean;
}

export interface StoriesFeedResponse {
  groups: StoryGroup[];
}

export interface StoryViewerItem {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  viewedAt: string;
}

export interface StoryViewersResponse {
  viewers: StoryViewerItem[];
  viewerCount: number;
}

export interface ReelAuthor {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  isFollowing: boolean;
}

export interface ReelItem {
  id: string;
  authorId: string;
  caption: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  saveCount?: number;
  shareCount?: number;
  likedByMe: boolean;
  savedByViewer?: boolean;
  savedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: ReelAuthor;
}

export interface ReelsFeedResponse {
  items: ReelItem[];
  nextCursor: string | null;
}

export interface ReelCommentItem {
  id: string;
  reelId: string;
  targetType: 'reel';
  parentCommentId?: string | null;
  replyToUserId?: string | null;
  replyToUser?: CommentReplyToUser | null;
  body: string;
  likeCount?: number;
  replyCount?: number;
  saveCount?: number;
  shareCount?: number;
  likedByViewer?: boolean;
  savedByViewer?: boolean;
  savedAt?: string;
  deleted?: boolean;
  createdAt: string;
  author: {
    userId: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
  topReplies?: ReelCommentItem[];
  parent?: CommentParentPreview;
}

export interface ReelLikerItem {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

export type AnalyticsPeriod = '7d' | '30d' | '90d';
export type AnalyticsContentType = 'post' | 'reel' | 'story';
export type AnalyticsSource = 'feed' | 'profile' | 'explore' | 'shared' | 'hashtag';
export type FollowSourceType = 'profile' | 'feed' | 'reel' | 'search' | 'suggestion' | 'other';

export interface OverviewTopContentItem {
  contentType: AnalyticsContentType;
  contentId: string;
  preview: string;
  thumbnailUrl?: string | null;
  metrics: {
    impressions: number;
    reach: number;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    engagementScore: number;
  };
}

export interface OverviewDailyActivityPoint {
  date: string;
  followersGained: number;
  impressions: number;
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement: number;
}

export interface AnalyticsOverviewResponse {
  period: AnalyticsPeriod;
  followers: { total: number; gained: number };
  profileVisits: number;
  content: { posts: number; reels: number; stories: number };
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    views: number;
    impressions: number;
    reach: number;
  };
  topContent: OverviewTopContentItem[];
  topByType: {
    post: OverviewTopContentItem | null;
    reel: OverviewTopContentItem | null;
    story: OverviewTopContentItem | null;
  };
  dailyActivity: OverviewDailyActivityPoint[];
  activityHeatmap: number[][];
  bestPerformingDay: string | null;
  bestTimeToPost: number[];
}

export interface PostAnalyticsRow {
  postId: string;
  preview: string;
  thumbnailUrl: string | null;
  createdAt: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profileVisits: number;
  newFollowers: number;
  engagementRate: number;
}

export interface ReelAnalyticsRow {
  reelId: string;
  preview: string;
  thumbnailUrl: string | null;
  createdAt: string;
  views: number;
  uniqueViews: number;
  watchSeconds: number;
  avgWatchSeconds: number;
  completionRate: number;
  replays: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  newFollowers: number;
}

export interface StoryAnalyticsRow {
  storyId: string;
  preview: string;
  thumbnailUrl: string | null;
  mediaType: 'image' | 'video' | null;
  createdAt: string;
  uniqueViewers: number;
  totalViews: number;
  completionRate: number;
  tapsForward: number;
  tapsBack: number;
  exits: number;
  replies: number;
}

export interface AnalyticsTimeSeriesBucket {
  date: string;
  impressions: number;
  reach: number;
  views: number;
  uniqueViews: number;
  watchSeconds: number;
  completions: number;
  tapsForward: number;
  tapsBack: number;
  exits: number;
  replays: number;
  likes: number;
  comments: number;
  replies: number;
  shares: number;
  saves: number;
}

export interface ContentAnalyticsDeepDiveResponse {
  contentType: AnalyticsContentType;
  contentId: string;
  preview: string;
  thumbnailUrl: string | null;
  mediaType?: 'image' | 'video' | null;
  createdAt: string;
  period: AnalyticsPeriod;
  profileVisits: number;
  newFollowers: number;
  totals: Omit<AnalyticsTimeSeriesBucket, 'date'>;
  series: AnalyticsTimeSeriesBucket[];
  trafficSources: Array<{ source: string; count: number }>;
  watchThroughBuckets?: Array<{
    bucket: string;
    minPct: number;
    count: number;
    percentage: number;
  }>;
  funnel?: {
    impressions: number;
    views: number;
    completed: number;
    replied: number;
  };
  hourlyViews?: Array<{ hourOffset: number; label: string; views: number }>;
}

export interface AudienceAnalyticsResponse {
  followerGrowth: Array<{ date: string; count: number }>;
  activeHours: Array<{ hour: number; followers: number }>;
  followSources: Array<{ source: string; count: number }>;
  activityHeatmap: number[][];
}

