// src/stores/appearance.ts —— 外观状态（persist key 必须叫 'appearance'，index.html 的 FOUC 脚本读它，见其注释）
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ACCENTS,
  applyAppearance,
  flavorDefaultAccent,
  resolveAccentVars,
  type AppearanceState,
} from '@/lib/appearance-dom';

interface AppearanceStore extends AppearanceState {
  layout: 'sidebar' | 'rail' | 'inset';
  pageAnim: 'none' | 'fade' | 'slide' | 'up' | 'scale';
  collapsed: Record<string, boolean>; // per-layout（spec §8.2）
  // 派生并持久化的已解析主题色（index.html FOUC 脚本读取，防自选主题色首帧闪回蓝，见 appearance-dom 契约注释）
  _priResolved: string;
  _priSoftResolved: string | null;
  set: (patch: Partial<AppearanceStore>) => void;
  setFlavor: (f: AppearanceState['flavor']) => void; // 耦合：切 flavor 重置 accent
  setCollapsed: (layoutKey: string, collapsed: boolean) => void;
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
      _priResolved: ACCENTS[0].pri,
      _priSoftResolved: ACCENTS[0].soft,
      set: (patch) => {
        set(patch);
        const next = get(); // zustand set 同步生效，get() 已是合并后状态
        applyAppearance(next);
        // 同步刷新持久化的派生主题色，供下次加载的 FOUC 脚本直接注入
        const { pri, soft } = resolveAccentVars(next);
        set({ _priResolved: pri, _priSoftResolved: soft });
      },
      setFlavor: (flavor) => get().set({ flavor, accent: flavorDefaultAccent(flavor) }), // 原型 L4951
      setCollapsed: (k, collapsed) =>
        set((s) => ({ collapsed: { ...s.collapsed, [k]: collapsed } })),
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
        _priResolved: s._priResolved,
        _priSoftResolved: s._priSoftResolved,
      }),
      // Task 2 review I-2：rehydrate 必须重放 accent 注入，否则 F5 后自选主题色丢失回蓝。
      // 同时校正派生主题色（防旧版持久化数据缺字段），保持 FOUC 派生值与真实解析一致。
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        applyAppearance(state);
        const { pri, soft } = resolveAccentVars(state);
        state._priResolved = pri;
        state._priSoftResolved = soft;
      },
    },
  ),
);
