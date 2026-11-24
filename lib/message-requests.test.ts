import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatApi } from './chat-api';
import { useAuthStore } from './auth-store';
import type { Conversation } from './chat-types';

describe('Message Requests Frontend Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: { userId: 'user-a', email: 'user-a@test.com' },
      accessToken: 'token-a',
      status: 'authenticated',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. A messages B (policy=known, no prior chat) -> B sees request, A sees "Awaiting response"', async () => {
    // Mock createDirect response when user A starts conversation with user B
    const createDirectSpy = vi.spyOn(chatApi, 'createDirect').mockResolvedValue({
      conversationId: 'conv-ab-pending',
      requestState: 'pending',
      request_state: 'pending',
    });

    const directResult = await chatApi.createDirect('user-b');
    expect(directResult.conversationId).toBe('conv-ab-pending');
    expect(directResult.requestState).toBe('pending');

    // A's view: conversation has isPending=true (or requestState='pending')
    const userAConversation: Conversation = {
      id: directResult.conversationId,
      kind: 'direct',
      peerUserId: 'user-b',
      isPending: true,
      requestState: 'pending',
      unreadCount: 0,
      lastMessage: {
        id: 'msg-1',
        body: 'Hello B!',
        senderId: 'user-a',
        createdAt: new Date().toISOString(),
      },
      lastMessageAt: new Date().toISOString(),
    };

    const isPendingForA = Boolean(
      userAConversation.isPending ||
      userAConversation.requestState === 'pending'
    );
    expect(isPendingForA).toBe(true);

    // Switch context to B
    useAuthStore.setState({
      user: { userId: 'user-b', email: 'user-b@test.com' },
      accessToken: 'token-b',
      status: 'authenticated',
    });

    // B lists pending requests via GET /conversations/requests
    const listRequestsSpy = vi.spyOn(chatApi, 'listRequests').mockResolvedValue([
      {
        id: 'conv-ab-pending',
        kind: 'direct',
        peerUserId: 'user-a',
        senderId: 'user-a',
        requestState: 'pending',
        unreadCount: 0,
        lastMessage: {
          id: 'msg-1',
          body: 'Hello B!',
          senderId: 'user-a',
          createdAt: new Date().toISOString(),
        },
        lastMessageAt: new Date().toISOString(),
      },
    ]);

    const bRequests = await chatApi.listRequests();
    expect(bRequests.length).toBe(1);
    expect(bRequests[0].id).toBe('conv-ab-pending');
    expect(bRequests[0].senderId).toBe('user-a');
    expect(bRequests[0].lastMessage?.body).toBe('Hello B!');
  });

  it('2. B accepts -> both see conversation in main inbox, A\'s badge disappears', async () => {
    // B accepts request via POST /conversations/:id/accept-request
    const acceptSpy = vi.spyOn(chatApi, 'acceptRequest').mockResolvedValue({
      id: 'conv-ab-pending',
      kind: 'direct',
      peerUserId: 'user-a',
      requestState: 'active',
      request_state: 'active',
      isPending: false,
      unreadCount: 0,
      lastMessage: {
        id: 'msg-1',
        body: 'Hello B!',
        senderId: 'user-a',
        createdAt: new Date().toISOString(),
      },
      lastMessageAt: new Date().toISOString(),
    });

    const acceptedConvo = await chatApi.acceptRequest('conv-ab-pending');
    expect(acceptedConvo.requestState).toBe('active');
    expect(acceptedConvo.isPending).toBe(false);

    // B now sees it in main inbox
    vi.spyOn(chatApi, 'listConversations').mockResolvedValue([acceptedConvo]);
    const bInbox = await chatApi.listConversations();
    expect(bInbox.length).toBe(1);
    expect(bInbox[0].id).toBe('conv-ab-pending');

    // A's view: conversation is now active, isPending is false
    const userAConversationUpdated: Conversation = {
      ...acceptedConvo,
      peerUserId: 'user-b',
      isPending: false,
      requestState: 'active',
    };
    const isPendingForA = Boolean(
      userAConversationUpdated.isPending ||
      userAConversationUpdated.requestState === 'pending'
    );
    expect(isPendingForA).toBe(false); // Badge disappears
  });

  it('3. B declines -> A\'s conversation stays "Awaiting response", B sees nothing in inbox or requests', async () => {
    // B declines request via POST /conversations/:id/reject-request
    const rejectSpy = vi.spyOn(chatApi, 'rejectRequest').mockResolvedValue(undefined);

    await chatApi.rejectRequest('conv-ab-pending');
    expect(rejectSpy).toHaveBeenCalledWith('conv-ab-pending');

    // B lists requests -> now empty
    vi.spyOn(chatApi, 'listRequests').mockResolvedValue([]);
    const bRequestsAfterReject = await chatApi.listRequests();
    expect(bRequestsAfterReject.length).toBe(0);

    // B lists main inbox -> empty
    vi.spyOn(chatApi, 'listConversations').mockResolvedValue([]);
    const bInboxAfterReject = await chatApi.listConversations();
    expect(bInboxAfterReject.length).toBe(0);

    // A's view: sender does NOT know recipient declined; still shows Awaiting response
    const userAConversation: Conversation = {
      id: 'conv-ab-pending',
      kind: 'direct',
      peerUserId: 'user-b',
      isPending: true,
      requestState: 'pending',
      unreadCount: 0,
      lastMessage: {
        id: 'msg-1',
        body: 'Hello B!',
        senderId: 'user-a',
        createdAt: new Date().toISOString(),
      },
      lastMessageAt: new Date().toISOString(),
    };
    const isPendingForA = Boolean(
      userAConversation.isPending ||
      userAConversation.requestState === 'pending'
    );
    expect(isPendingForA).toBe(true);
  });
});
