import { create } from 'zustand';
import type { CallState } from './call-types';

export interface CallStore {
  state: CallState;
  isMuted: boolean;
  isDeafened: boolean;
  incomingRingtonePlaying: boolean;
  peerDisconnected: boolean;

  setState: (s: CallState) => void;
  setMuted: (m: boolean) => void;
  setDeafened: (d: boolean) => void;
  setPeerDisconnected: (pd: boolean) => void;
  setIncomingRingtonePlaying: (playing: boolean) => void;
  reset: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  state: { kind: 'idle' },
  isMuted: false,
  isDeafened: false,
  incomingRingtonePlaying: false,
  peerDisconnected: false,

  setState: (state) => set({ state }),
  setMuted: (isMuted) => set({ isMuted }),
  setDeafened: (isDeafened) => set({ isDeafened }),
  setPeerDisconnected: (peerDisconnected) => set({ peerDisconnected }),
  setIncomingRingtonePlaying: (incomingRingtonePlaying) =>
    set({ incomingRingtonePlaying }),
  reset: () =>
    set({
      state: { kind: 'idle' },
      isMuted: false,
      isDeafened: false,
      incomingRingtonePlaying: false,
      peerDisconnected: false,
    }),
}));
