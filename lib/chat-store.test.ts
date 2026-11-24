import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chat-store';

describe('useChatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      typingByConversation: {},
      drafts: {},
      activeConversationId: null,
      wsStatus: 'disconnected',
      presenceByUser: {},
    });
  });

  it('manages drafts per conversation', () => {
    const store = useChatStore.getState();
    store.setDraft('conv-1', 'Hello world');
    expect(useChatStore.getState().drafts['conv-1']).toBe('Hello world');

    store.setDraft('conv-2', 'Another draft');
    expect(useChatStore.getState().drafts['conv-2']).toBe('Another draft');

    store.clearDraft('conv-1');
    expect(useChatStore.getState().drafts['conv-1']).toBeUndefined();
    expect(useChatStore.getState().drafts['conv-2']).toBe('Another draft');
  });

  it('manages typing status and prunes expired users', () => {
    const store = useChatStore.getState();
    store.addTyping('conv-1', 'user-123');

    let typing = useChatStore.getState().typingByConversation['conv-1'];
    expect(typing).toBeDefined();
    expect(typing.length).toBe(1);
    expect(typing[0].userId).toBe('user-123');

    // Manually set expiresAt to past and prune
    useChatStore.setState({
      typingByConversation: {
        'conv-1': [{ userId: 'user-123', expiresAt: Date.now() - 1000 }],
      },
    });

    useChatStore.getState().pruneExpiredTyping();
    typing = useChatStore.getState().typingByConversation['conv-1'];
    expect(typing).toBeUndefined();
  });

  it('manages presence updates', () => {
    const store = useChatStore.getState();
    store.setPresence('user-1', { status: 'online' });
    expect(useChatStore.getState().presenceByUser['user-1'].status).toBe('online');

    store.batchSetPresence({
      'user-2': { status: 'online' },
      'user-3': { status: 'offline', lastSeenAt: '2026-11-24T12:00:00Z' },
    });

    expect(useChatStore.getState().presenceByUser['user-2'].status).toBe('online');
    expect(useChatStore.getState().presenceByUser['user-3'].status).toBe('offline');
  });

  it('manages replyingTo state', () => {
    const store = useChatStore.getState();
    const mockMsg = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      body: 'Hello to reply to',
      createdAt: '2026-11-24T12:00:00Z',
      editedAt: null,
      deleted: false,
    };

    store.setReplyingTo(mockMsg);
    expect(useChatStore.getState().replyingTo).toEqual(mockMsg);

    store.clearReplyingTo();
    expect(useChatStore.getState().replyingTo).toBeNull();
  });

  it('manages active conversation and WS status', () => {
    const store = useChatStore.getState();
    store.setActiveConversation('conv-99');
    expect(useChatStore.getState().activeConversationId).toBe('conv-99');

    store.setWsStatus('connected');
    expect(useChatStore.getState().wsStatus).toBe('connected');
  });
});
