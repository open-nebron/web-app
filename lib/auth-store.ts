import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  user: { userId: string; email: string } | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  setAccessToken: (token: string | null) => void;
  setUser: (user: AuthState['user']) => void;
  setStatus: (s: AuthState['status']) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: 'loading',
  setAccessToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
  clear: () => set({ accessToken: null, user: null, status: 'unauthenticated' }),
}));

