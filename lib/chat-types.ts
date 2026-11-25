export type ConversationKind = 'direct' | 'group';

export interface MessageSummary {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  kind: ConversationKind;
  peerUserId?: string;
  name?: string;
  ownerId?: string;
  memberCount?: number;
  unreadCount: number;
  lastMessage: MessageSummary | null;
  lastMessageAt: string | null;
  // Hydrated peer profile for UI convenience
  peerProfile?: PublicUser | null;
  // Message request state
  requestState?: 'active' | 'pending' | 'rejected' | null;
  request_state?: 'active' | 'pending' | 'rejected' | null;
  isPending?: boolean;
  senderId?: string;
  createdAt?: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface MessagePreview {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  deleted: boolean;
}

export interface ForwardedFromInfo {
  senderId: string;
  messageId?: string;
  conversationId?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  status?: MessageStatus;
  clientId?: string;
  senderProfile?: PublicUser | null;
  reactions?: ReactionSummary[];
  replyToId?: string | null;
  replyTo?: MessagePreview | null;
  forwardedFrom?: ForwardedFromInfo | null;
  kind?: string | null;
}

export interface ConversationMember {
  userId: string;
  joinedAt: string;
  role: 'owner' | 'admin' | 'member';
  profile?: PublicUser | null;
}

export interface ConversationInvite {
  code: string;
  url: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
}

export interface PublicUser {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  about?: string | null;
  createdAt?: string;
}

export interface MuteState {
  calls: boolean;
  messages: boolean;
  until?: string | null;
}

export interface UserRelationship {
  blocked: boolean;
  mute?: MuteState;
  muted?: MuteState;
}

export interface BlockedUser {
  userId: string;
  blockedAt: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
}

// WebSocket Frames
export interface WSBaseFrame {
  type: string;
  id?: string;
  ackId?: string;
}

export interface WSErrorPayload {
  code: string;
  message: string;
}

export interface WSMessageSentPayload {
  conversationId: string;
  clientId?: string;
  delivered: boolean;
  message?: {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
    editedAt: string | null;
    deleted: boolean;
  };
}

export interface WSMessageNewPayload {
  message: {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    createdAt: string;
    editedAt: string | null;
    deleted: boolean;
    forwardedFrom?: ForwardedFromInfo | null;
    replyToId?: string | null;
    replyTo?: MessagePreview | null;
  };
  senderId: string;
}

export interface WSMessageReadPayload {
  conversationId: string;
  userId: string;
  messageId: string;
  readAt: string;
}

export interface WSTypingUpdatePayload {
  conversationId: string;
  userId: string;
  typing?: boolean;
  isTyping?: boolean;
}

export type WSTypingPayload = WSTypingUpdatePayload;

export interface WSPresenceUpdatePayload {
  userId: string;
  status?: 'online' | 'offline';
  online?: boolean;
  lastSeenAt?: string;
}

export type WSPresencePayload = WSPresenceUpdatePayload;

export interface WSConversationEventPayload {
  conversationId: string;
  userId?: string;
  name?: string;
  operatorId?: string;
}

export interface StarredMessage {
  userId: string;
  starredAt: string;
  conversationId: string;
  messageId: string;
  message: ChatMessage | null;
}

export interface WSMessageEditedPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  body: string;
  editedAt: string;
  message?: ChatMessage;
}

export interface WSMessageStarredPayload {
  userId: string;
  conversationId: string;
  messageId: string;
  starredAt: string;
}

export interface WSMessageUnstarredPayload {
  userId: string;
  conversationId: string;
  messageId: string;
  at: string;
}

export interface WSReactionAddedPayload {
  conversationId: string;
  messageId: string;
  emoji: string;
  userId: string;
  createdAt: string;
}

export interface WSReactionRemovedPayload {
  conversationId: string;
  messageId: string;
  emoji: string;
  userId: string;
}

export interface SearchMessageResult {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  highlightedBody: string;
  createdAt: string;
}
