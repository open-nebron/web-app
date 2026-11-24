import { create } from 'zustand';

export interface TypingUser {
  userId: string;
  expiresAt: number; // epoch ms
}

export interface PresenceInfo {
  status: 'online' | 'offline';
  lastSeenAt?: string;
}

export interface ChatState {
  typingByConversation: Record<string, TypingUser[]>;
  drafts: Record<string, string>;
  activeConversationId: string | null;
  wsStatus: 'connecting' | 'connected' | 'disconnected' | 'auth-failed';
  presenceByUser: Record<string, PresenceInfo>;

  addTyping: (conversationId: string, userId: string) => void;
  clearTyping: (conversationId: string, userId: string) => void;
  pruneExpiredTyping: () => void;
  setDraft: (conversationId: string, text: string) => void;
  clearDraft: (conversationId: string) => void;
  setActiveConversation: (id: string | null) => void;
  setWsStatus: (status: ChatState['wsStatus']) => void;
  setPresence: (userId: string, presence: PresenceInfo) => void;
  batchSetPresence: (entries: Record<string, PresenceInfo>) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  typingByConversation: {},
  drafts: {},
  activeConversationId: null,
  wsStatus: 'disconnected',
  presenceByUser: {},

  addTyping: (conversationId, userId) =>
    set((state) => {
      const now = Date.now();
      const currentList = state.typingByConversation[conversationId] || [];
      const updated = currentList.filter((u) => u.userId !== userId);
      updated.push({ userId, expiresAt: now + 5000 });

      return {
        typingByConversation: {
          ...state.typingByConversation,
          [conversationId]: updated,
        },
      };
    }),

  clearTyping: (conversationId, userId) =>
    set((state) => {
      const currentList = state.typingByConversation[conversationId] || [];
      const updated = currentList.filter((u) => u.userId !== userId);

      return {
        typingByConversation: {
          ...state.typingByConversation,
          [conversationId]: updated,
        },
      };
    }),

  pruneExpiredTyping: () =>
    set((state) => {
      const now = Date.now();
      let changed = false;
      const nextMap: Record<string, TypingUser[]> = {};

      for (const [convId, list] of Object.entries(state.typingByConversation)) {
        const valid = list.filter((u) => u.expiresAt > now);
        if (valid.length !== list.length) {
          changed = true;
        }
        if (valid.length > 0) {
          nextMap[convId] = valid;
        }
      }

      if (!changed) return state;

      return {
        typingByConversation: nextMap,
      };
    }),

  setDraft: (conversationId, text) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [conversationId]: text,
      },
    })),

  clearDraft: (conversationId) =>
    set((state) => {
      const nextDrafts = { ...state.drafts };
      delete nextDrafts[conversationId];
      return { drafts: nextDrafts };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setWsStatus: (wsStatus) => set({ wsStatus }),

  setPresence: (userId, presence) =>
    set((state) => ({
      presenceByUser: {
        ...state.presenceByUser,
        [userId]: presence,
      },
    })),

  batchSetPresence: (entries) =>
    set((state) => ({
      presenceByUser: {
        ...state.presenceByUser,
        ...entries,
      },
    })),
}));

// Auto-expiry interval for typing status (runs once in browser environment)
if (typeof window !== 'undefined') {
  setInterval(() => {
    useChatStore.getState().pruneExpiredTyping();
  }, 1000);
}
