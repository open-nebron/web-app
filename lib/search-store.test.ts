import { describe, it, expect, beforeEach } from 'vitest';
import { useSearchStore } from './search-store';

describe('useSearchStore', () => {
  beforeEach(() => {
    useSearchStore.setState({
      isOpen: false,
      conversationId: null,
    });
  });

  it('opens and closes search dialog', () => {
    expect(useSearchStore.getState().isOpen).toBe(false);

    useSearchStore.getState().openSearch();
    expect(useSearchStore.getState().isOpen).toBe(true);
    expect(useSearchStore.getState().conversationId).toBeNull();

    useSearchStore.getState().closeSearch();
    expect(useSearchStore.getState().isOpen).toBe(false);
  });

  it('opens search scoped to a specific conversation', () => {
    useSearchStore.getState().openSearch('conv-123');
    expect(useSearchStore.getState().isOpen).toBe(true);
    expect(useSearchStore.getState().conversationId).toBe('conv-123');
  });

  it('toggles search state cleanly', () => {
    useSearchStore.getState().toggleSearch('conv-456');
    expect(useSearchStore.getState().isOpen).toBe(true);
    expect(useSearchStore.getState().conversationId).toBe('conv-456');

    useSearchStore.getState().toggleSearch();
    expect(useSearchStore.getState().isOpen).toBe(false);
  });
});
