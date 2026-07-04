// src/stores/auth.ts —— 铁律：只存 token，其余身份信息（用户/权限）走接口拉取，不进 persist。
// 这样刷新后会重新校准权限，避免 localStorage 里的旧角色继续影响菜单和页面守卫。
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appConfig } from '@/config';

interface AuthStore {
  token: string | null;
  setToken: (t: string | null) => void;
}

export const useAuth = create<AuthStore>()(
  persist((set) => ({ token: null, setToken: (token) => set({ token }) }), {
    name: appConfig.storageKeys.auth,
  }),
);
