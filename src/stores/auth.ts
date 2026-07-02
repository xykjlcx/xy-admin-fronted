// src/stores/auth.ts —— 铁律：只存 token，其余身份信息（用户/权限）走接口拉取，不进 persist
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  token: string | null;
  setToken: (t: string | null) => void;
}

export const useAuth = create<AuthStore>()(
  persist((set) => ({ token: null, setToken: (token) => set({ token }) }), { name: 'auth' }),
);
