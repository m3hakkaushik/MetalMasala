import { create } from 'zustand';

export const useAuth = create((set) => ({
  status: 'checking',
  user: null,
  accessToken: null,
  sessionVersion: 0,
  setSession: ({ user, accessToken }) =>
    set(({ sessionVersion }) => ({
      user,
      accessToken,
      status: 'authenticated',
      sessionVersion: sessionVersion + 1,
    })),
  setToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () =>
    set(({ sessionVersion }) => ({
      user: null,
      accessToken: null,
      status: 'guest',
      sessionVersion: sessionVersion + 1,
    })),
}));
