import { useAppearance } from '@/stores/appearance';

const DEFAULTS = {
  flavor: 'feishu',
  mode: 'light',
  accent: 'blue',
  customAccent: '#c96442',
  zoom: 'md',
  radius: 'default',
  layout: 'sidebar',
  pageAnim: 'fade',
  collapsed: {},
} as const;

beforeEach(() => {
  localStorage.clear();
  useAppearance.setState(DEFAULTS); // 合并而非 replace，避免连 set/setFlavor/toggleCollapsed 一起冲掉
});

test('切 flavor 重置 accent 为 flavor 默认（原型耦合规则）', () => {
  useAppearance.getState().set({ accent: 'violet' });
  useAppearance.getState().setFlavor('claude');
  expect(useAppearance.getState().accent).toBe('claude');
  useAppearance.getState().setFlavor('feishu');
  expect(useAppearance.getState().accent).toBe('blue');
  useAppearance.getState().setFlavor('shadcn');
  expect(useAppearance.getState().accent).toBe('shadcn');
});

test('toggleCollapsed 只影响对应 layout key（per-layout 隔离）', () => {
  useAppearance.getState().toggleCollapsed('sidebar');
  expect(useAppearance.getState().collapsed.sidebar).toBe(true);
  expect(useAppearance.getState().collapsed.rail).toBeUndefined();

  useAppearance.getState().toggleCollapsed('sidebar');
  expect(useAppearance.getState().collapsed.sidebar).toBe(false);
  expect(useAppearance.getState().collapsed.rail).toBeUndefined();
});

test('setCollapsed 按传入布尔值显式设置 layout 折叠态', () => {
  useAppearance.getState().setCollapsed('sidebar', true);
  expect(useAppearance.getState().collapsed.sidebar).toBe(true);

  useAppearance.getState().setCollapsed('sidebar', true);
  expect(useAppearance.getState().collapsed.sidebar).toBe(true);

  useAppearance.getState().setCollapsed('sidebar', false);
  expect(useAppearance.getState().collapsed.sidebar).toBe(false);
});

test('set 持久化 --on-pri 派生值，供 FOUC 脚本首帧注入', () => {
  useAppearance.getState().set({ accent: 'custom', customAccent: '#f5c518' });

  expect(useAppearance.getState()._priResolved).toBe('#f5c518');
  expect(useAppearance.getState()._priSoftResolved).toBe('rgba(245,197,24,.12)');
  expect(useAppearance.getState()._onPriResolved).toBe('#18181b');
  expect(document.documentElement.style.getPropertyValue('--on-pri')).toBe('#18181b');
});

// ⚠️ 本用例依赖 vi.resetModules() 产生独立 store 实例（重跑 rehydrate），
// 必须保持在文件最后/可独立运行——否则污染后续用例共享的模块单例。
test('rehydrate 时重放 accent 注入（F5 后自选主题色不丢失）', async () => {
  localStorage.setItem(
    'appearance',
    JSON.stringify({ state: { ...DEFAULTS, accent: 'violet' }, version: 0 }),
  );
  vi.resetModules();
  const mod = await import('@/stores/appearance');
  await mod.useAppearance.persist.rehydrate();

  expect(mod.useAppearance.getState().accent).toBe('violet');
  expect(document.documentElement.style.getPropertyValue('--pri')).toBe('#7c3aed');
  expect(mod.useAppearance.getState()._onPriResolved).toBe('#ffffff');
});
