import { describe, it, expect, beforeEach } from 'vitest';
import { useCallStore } from './call-store';
import type { CallState } from './call-types';

describe('Call State Machine (useCallStore)', () => {
  beforeEach(() => {
    useCallStore.getState().reset();
  });

  // 1. Calling reset() from any state -> idle
  it('calling reset() from any state returns to idle', () => {
    const store = useCallStore.getState();

    // Set to outgoing
    store.setState({
      kind: 'outgoing',
      callId: 'call-1',
      calleeId: 'user-2',
      roomName: 'room-1',
      startedAt: '2026-11-24T12:00:00Z',
    });
    expect(useCallStore.getState().state.kind).toBe('outgoing');

    // Reset
    useCallStore.getState().reset();
    expect(useCallStore.getState().state.kind).toBe('idle');

    // Set to active
    useCallStore.getState().setState({
      kind: 'active',
      callId: 'call-2',
      roomName: 'room-2',
      livekitUrl: 'ws://localhost:7880',
      token: 'tok',
      peerId: 'user-3',
      startedAt: '2026-11-24T12:00:00Z',
      connectedAt: '2026-11-24T12:00:05Z',
    });
    useCallStore.getState().setMuted(true);
    useCallStore.getState().setDeafened(true);

    expect(useCallStore.getState().isMuted).toBe(true);
    expect(useCallStore.getState().isDeafened).toBe(true);

    useCallStore.getState().reset();
    const finalState = useCallStore.getState();
    expect(finalState.state.kind).toBe('idle');
    expect(finalState.isMuted).toBe(false);
    expect(finalState.isDeafened).toBe(false);
  });

  // 2. Transitions: idle -> incoming -> connecting -> active -> ended -> idle
  it('transitions sequentially through idle -> incoming -> connecting -> active -> ended -> idle', () => {
    const store = useCallStore.getState();
    expect(store.state.kind).toBe('idle');

    // Transition to incoming
    store.setState({
      kind: 'incoming',
      callId: 'call-123',
      callerId: 'user-alice',
      roomName: 'room-123',
      startedAt: '2026-11-24T12:00:00Z',
    });
    expect(useCallStore.getState().state.kind).toBe('incoming');

    // Transition to connecting
    store.setState({
      kind: 'connecting',
      callId: 'call-123',
      roomName: 'room-123',
      livekitUrl: 'ws://localhost:7880',
      token: 'token-abc',
      peerId: 'user-alice',
      startedAt: '2026-11-24T12:00:00Z',
    });
    expect(useCallStore.getState().state.kind).toBe('connecting');

    // Transition to active
    const connectedAt = '2026-11-24T12:00:02Z';
    store.setState({
      kind: 'active',
      callId: 'call-123',
      roomName: 'room-123',
      livekitUrl: 'ws://localhost:7880',
      token: 'token-abc',
      peerId: 'user-alice',
      startedAt: '2026-11-24T12:00:00Z',
      connectedAt,
    });
    expect(useCallStore.getState().state.kind).toBe('active');

    // Transition to ended
    store.setState({
      kind: 'ended',
      callId: 'call-123',
      reason: 'call_ended',
      duration: 45,
    });
    expect(useCallStore.getState().state.kind).toBe('ended');

    // Reset to idle
    store.reset();
    expect(useCallStore.getState().state.kind).toBe('idle');
  });

  // 3. Reconnect preserves connectedAt timestamp
  it('reconnect transition preserves connectedAt timestamp', () => {
    const store = useCallStore.getState();
    const connectedAt = '2026-11-24T12:00:10.000Z';

    // Active state
    store.setState({
      kind: 'active',
      callId: 'call-456',
      roomName: 'room-456',
      livekitUrl: 'ws://localhost:7880',
      token: 'token-old',
      peerId: 'user-bob',
      startedAt: '2026-11-24T12:00:00.000Z',
      connectedAt,
    });

    const activeState = useCallStore.getState().state;
    expect(activeState.kind).toBe('active');

    // Network drops: transition to reconnecting
    if (activeState.kind === 'active') {
      store.setState({
        ...activeState,
        kind: 'reconnecting',
      });
    }

    const reconnectingState = useCallStore.getState().state;
    expect(reconnectingState.kind).toBe('reconnecting');
    if (reconnectingState.kind === 'reconnecting') {
      expect(reconnectingState.connectedAt).toBe(connectedAt);
    }

    // Reconnected: transition back to active
    if (reconnectingState.kind === 'reconnecting') {
      store.setState({
        ...reconnectingState,
        kind: 'active',
      });
    }

    const restoredState = useCallStore.getState().state;
    expect(restoredState.kind).toBe('active');
    if (restoredState.kind === 'active') {
      expect(restoredState.connectedAt).toBe(connectedAt);
    }
  });
});
