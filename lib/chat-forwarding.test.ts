import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatApi } from './chat-api';
import * as apiModule from './api';

describe('Chat Forwarding', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends forwarded message body when forwarding without comment', async () => {
    const fetchSpy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
      data: {
        id: 'msg-fwd-1',
        conversationId: 'conv-target',
        senderId: 'user-me',
        body: 'Original secret message',
        createdAt: new Date().toISOString(),
        deleted: false,
        forwardedFrom: {
          senderId: 'user-alice',
          messageId: 'msg-orig-1',
          conversationId: 'conv-src',
        },
      },
    });

    const originalMessage = {
      id: 'msg-orig-1',
      conversationId: 'conv-src',
      senderId: 'user-alice',
      body: 'Original secret message',
    };

    // Forwarding logic in handleForward
    const comment = '';
    const finalBody = comment.trim()
      ? `${comment.trim()}\n\n${originalMessage.body}`
      : originalMessage.body;

    await chatApi.sendMessageHttp(
      'conv-target',
      finalBody,
      undefined,
      undefined,
      {
        messageId: originalMessage.id,
        conversationId: originalMessage.conversationId,
        senderId: originalMessage.senderId,
      }
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/chat/conversations/conv-target/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          body: 'Original secret message',
          forwardOf: {
            messageId: 'msg-orig-1',
            conversationId: 'conv-src',
            senderId: 'user-alice',
          },
        }),
      })
    );
  });

  it('combines optional comment with original body when comment is provided', async () => {
    const fetchSpy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
      data: {
        id: 'msg-fwd-2',
        conversationId: 'conv-target',
        senderId: 'user-me',
        body: 'Check this out\n\nOriginal secret message',
        createdAt: new Date().toISOString(),
        deleted: false,
        forwardedFrom: {
          senderId: 'user-alice',
          messageId: 'msg-orig-1',
          conversationId: 'conv-src',
        },
      },
    });

    const originalMessage = {
      id: 'msg-orig-1',
      conversationId: 'conv-src',
      senderId: 'user-alice',
      body: 'Original secret message',
    };

    const comment = 'Check this out';
    const finalBody = comment.trim()
      ? `${comment.trim()}\n\n${originalMessage.body}`
      : originalMessage.body;

    await chatApi.sendMessageHttp(
      'conv-target',
      finalBody,
      undefined,
      undefined,
      {
        messageId: originalMessage.id,
        conversationId: originalMessage.conversationId,
        senderId: originalMessage.senderId,
      }
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/chat/conversations/conv-target/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          body: 'Check this out\n\nOriginal secret message',
          forwardOf: {
            messageId: 'msg-orig-1',
            conversationId: 'conv-src',
            senderId: 'user-alice',
          },
        }),
      })
    );
  });
});
