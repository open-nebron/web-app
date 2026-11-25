import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  user: { userId: string; email: string } | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  bannedState: { isBanned: boolean; reason: string | null } | null;
  setAccessToken: (token: string | null) => void;
  setUser: (user: AuthState['user']) => void;
  setStatus: (s: AuthState['status']) => void;
  setBanned: (banned: { isBanned: boolean; reason: string | null } | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'loading',
  bannedState: null,
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
  setBanned: (bannedState) => set({ bannedState }),
  clear: () => set({ accessToken: null, user: null, status: 'unauthenticated', bannedState: null }),
}));
