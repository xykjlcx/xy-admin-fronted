// src/stores/appearance.ts —— 外观状态（persist key 必须叫 'appearance'，index.html 的 FOUC 脚本读它，见其注释）
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyAppearance, flavorDefaultAccent, type AppearanceState } from '@/lib/appearance-dom';

interface AppearanceStore extends AppearanceState {
  layout: 'sidebar' | 'rail' | 'inset';
  pageAnim: 'none' | 'fade' | 'slide' | 'up' | 'scale';
  collapsed: Record<string, boolean>; // per-layout（spec §8.2）
  set: (patch: Partial<AppearanceStore>) => void;
  setFlavor: (f: AppearanceState['flavor']) => void; // 耦合：切 flavor 重置 accent
  toggleCollapsed: (layoutKey: string) => void;
}

export const useAppearance = create<AppearanceStore>()(
  persist(
    (set, get) => ({
      flavor: 'feishu',
      mode: 'light',
      accent: 'blue',
      customAccent: '#c96442',
      zoom: 'md',
      radius: 'default',
      layout: 'sidebar',
      pageAnim: 'fade',
      collapsed: {},
      set: (patch) => {
        set(patch);
        applyAppearance(get()); // zustand set 同步生效，get() 已是合并后状态，无需再 spread patch
      },
      setFlavor: (flavor) => get().set({ flavor, accent: flavorDefaultAccent(flavor) }), // 原型 L4951
      toggleCollapsed: (k) => set((s) => ({ collapsed: { ...s.collapsed, [k]: !s.collapsed[k] } })),
    }),
    {
      name: 'appearance',
      // 只持久化数据字段，排除函数（避免把 set/setFlavor/toggleCollapsed 序列化进 localStorage）
      partialize: (s) => ({
        flavor: s.flavor,
        mode: s.mode,
        accent: s.accent,
        customAccent: s.customAccent,
        zoom: s.zoom,
        radius: s.radius,
        layout: s.layout,
        pageAnim: s.pageAnim,
        collapsed: s.collapsed,
      }),
      // Task 2 review I-2：rehydrate 必须重放 accent 注入，否则 F5 后自选主题色丢失回蓝
      onRehydrateStorage: () => (state) => {
        if (state) applyAppearance(state);
      },
    },
  ),
);
