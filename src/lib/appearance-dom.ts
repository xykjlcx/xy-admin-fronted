// src/lib/appearance-dom.ts —— 外观状态写入 <html> 的唯一出口；耦合规则集中在此
// 契约：boot/rehydrate 时必须调用一次 applyAppearance，否则 --pri 注入丢失（CSS 只有 feishu 蓝兜底）
export type Flavor = 'feishu' | 'claude';
export type Mode = 'light' | 'dark';
export type Zoom = 'sm' | 'md' | 'lg';
export type Radius = 'sharp' | 'default' | 'round';

export const ACCENTS = [
  { key: 'blue', pri: '#3370ff', soft: '#eef3ff' },
  { key: 'claude', pri: '#c96442', soft: '#f8ede7' },
  { key: 'green', pri: '#16a34a', soft: '#e8f7ee' },
  { key: 'violet', pri: '#7c3aed', soft: '#f3edff' },
] as const;
export type AccentKey = (typeof ACCENTS)[number]['key'] | 'custom';

const FLAVOR_DEFAULT_ACCENT: Record<Flavor, AccentKey> = {
  feishu: 'blue',
  claude: 'claude',
}; // 原型 L4785

export function flavorDefaultAccent(flavor: Flavor): AccentKey {
  return FLAVOR_DEFAULT_ACCENT[flavor];
}

export function hexToSoft(hex: string): string {
  // 原型 L4787
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},.12)`;
}

export interface AppearanceState {
  flavor: Flavor;
  mode: Mode;
  accent: AccentKey;
  customAccent: string;
  zoom: Zoom;
  radius: Radius;
}

export function applyAppearance(s: AppearanceState): void {
  const el = document.documentElement;
  el.dataset.flavor = s.flavor;
  el.dataset.mode = s.mode;
  if (s.radius === 'default') delete el.dataset.radius;
  else el.dataset.radius = s.radius;
  if (s.zoom === 'md') delete el.dataset.zoom;
  else el.dataset.zoom = s.zoom;
  const acc =
    s.accent === 'custom'
      ? { pri: s.customAccent, soft: hexToSoft(s.customAccent) }
      : (ACCENTS.find((a) => a.key === s.accent) ?? ACCENTS[0]);
  el.style.setProperty('--pri', acc.pri);
  // 耦合规则（原型 L4798-4803）：暗色下 soft 固定白 alpha，与主题色无关
  if (s.mode === 'light') el.style.setProperty('--pri-soft', acc.soft);
  else el.style.removeProperty('--pri-soft');
}
