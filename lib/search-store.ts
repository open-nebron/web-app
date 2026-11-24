import { create } from 'zustand';

interface SearchState {
  isOpen: boolean;
  conversationId: string | null;
  openSearch: (conversationId?: string | null) => void;
  closeSearch: () => void;
  toggleSearch: (conversationId?: string | null) => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  isOpen: false,
  conversationId: null,
  openSearch: (conversationId = null) =>
    set({ isOpen: true, conversationId: conversationId ?? null }),
  closeSearch: () => set({ isOpen: false }),
  toggleSearch: (conversationId = null) => {
    const { isOpen } = get();
    if (isOpen) {
      set({ isOpen: false });
    } else {
      set({ isOpen: true, conversationId: conversationId ?? null });
    }
  },
}));
