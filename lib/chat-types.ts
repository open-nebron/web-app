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
}

export interface ConversationMember {
  userId: string;
  joinedAt: string;
  role: 'owner' | 'member';
  profile?: PublicUser | null;
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

export interface UserRelationship {
  blocked: boolean;
  muted: {
    calls: boolean;
    messages: boolean;
    until?: string | null;
  };
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
