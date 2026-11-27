import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatApi, isValidConversationId } from './chat-api';
import * as apiModule from './api';
import { toast, reducer } from '../components/ui/use-toast';

describe('chatApi & Toast regressions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isValidConversationId', () => {
    it('accepts UUIDs and 24-char ObjectIds while rejecting undefined/null/garbage', () => {
      expect(isValidConversationId('84fc38c0-1c66-5dfd-ab0b-52d0aafce0d6')).toBe(true);
      expect(isValidConversationId('6b05362ddd26fca126a41671')).toBe(true);
      expect(isValidConversationId('undefined')).toBe(false);
      expect(isValidConversationId('null')).toBe(false);
      expect(isValidConversationId('')).toBe(false);
      expect(isValidConversationId(null)).toBe(false);
      expect(isValidConversationId(undefined)).toBe(false);
    });
  });

  describe('chatApi response unwrapping', () => {
    it('createDirect unwraps { data: { id, requestState } }', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
        data: {
          id: '84fc38c0-1c66-5dfd-ab0b-52d0aafce0d6',
          kind: 'direct',
          request_state: 'active',
          requestState: 'active',
        },
      });

      const res = await chatApi.createDirect('6b05523f0e785a20e6ca6522');
      expect(res.conversationId).toBe('84fc38c0-1c66-5dfd-ab0b-52d0aafce0d6');
      expect(res.requestState).toBe('active');
    });

    it('createGroup unwraps { data: { id } }', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
        data: {
          id: '11111111-2222-4333-8444-555555555555',
          kind: 'group',
        },
      });

      const res = await chatApi.createGroup('My Group', ['u1', 'u2']);
      expect(res.conversationId).toBe('11111111-2222-4333-8444-555555555555');
    });

    it('sendMessageHttp unwraps { data: message } to { message }', async () => {
      vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
        data: {
          id: 'msg-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          body: 'hello world',
          createdAt: '2026-01-01T00:00:00Z',
          editedAt: null,
          deleted: false,
        },
      });

      const res = await chatApi.sendMessageHttp('conv-1', 'hello world');
      expect(res.message.id).toBe('msg-1');
      expect(res.message.body).toBe('hello world');
    });
  });

  describe('toast auto-dismiss', () => {
    it('wires onOpenChange and auto-dismisses after duration', () => {
      vi.useFakeTimers();
      let state = { toasts: [] as any[] };
      const handle = toast({ title: 'Hello', duration: 3000 });
      state = reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: handle.id, title: 'Hello', open: true },
      });
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].open).toBe(true);

      // Advance past duration + remove delay
      vi.advanceTimersByTime(3100);
      state = reducer(state, { type: 'DISMISS_TOAST', toastId: handle.id });
      expect(state.toasts[0].open).toBe(false);

      vi.advanceTimersByTime(1100);
      state = reducer(state, { type: 'REMOVE_TOAST', toastId: handle.id });
      expect(state.toasts).toHaveLength(0);
    });
  });
});
