// src/stores/auth.ts —— 铁律：只存当前进程内 token，不拥有任何持久化策略。
// Web localStorage 与 Electron safeStorage 统一由 SessionCredentialService 编排。
import { create } from 'zustand';

interface AuthStore {
  token: string | null;
  setToken: (t: string | null) => void;
}

export const useAuth = create<AuthStore>((set) => ({ token: null, setToken: (token) => set({ token }) }));
