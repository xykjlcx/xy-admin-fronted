// src/lib/appearance-dom.ts —— 外观状态写入 <html> 的唯一出口；耦合规则集中在此
// 契约：boot/rehydrate 时必须调用一次 applyAppearance，否则 --pri 注入丢失（CSS 只有 feishu 蓝兜底）。
// 首帧防闪：appearance store 额外持久化派生的 _priResolved/_priActiveResolved/_priSoftResolved/_onPriResolved（= resolveAccentVars 结果），
//   index.html FOUC 脚本读到就直接 setProperty --pri/--pri-active/--pri-soft/--on-pri，避免自选主题色首帧闪回默认值。
export type Flavor = 'feishu' | 'claude' | 'shadcn';
export type Mode = 'light' | 'dark';
export type Zoom = 'sm' | 'md' | 'lg';
export type Radius = 'sharp' | 'default' | 'round';

// labelKey 对应 shell.appearanceDrawer.<labelKey> 词条（同 FLAVOR_OPTS 的 label/desc 走 i18n 的模式），
// 不在此处硬编码中文——色名随语言切换，不能像 hex 值一样当常量数据处理。
export const ACCENTS = [
  { key: 'blue', labelKey: 'accentBlue', pri: '#3370ff', soft: '#eef3ff' },
  { key: 'claude', labelKey: 'accentClaude', pri: '#d97757', active: '#c6613f', soft: 'rgba(217,119,87,.12)', onPri: '#ffffff' },
  { key: 'shadcn', labelKey: 'accentShadcn', pri: '#18181b', priDark: '#fafafa', soft: '#f4f4f5' },
  { key: 'green', labelKey: 'accentGreen', pri: '#16a34a', soft: '#e8f7ee' },
  { key: 'violet', labelKey: 'accentViolet', pri: '#7c3aed', soft: '#f3edff' },
] as const;
export type AccentKey = (typeof ACCENTS)[number]['key'] | 'custom';

// 界面风格预设的取色器预览色块（原型 flavorOptions L4948-4949）。放在 .ts 文件里承载十六进制常量
// （ESLint 色值铁律只约束 .tsx），组件用 style 内联消费（数据，非硬编码字面量）。
export const FLAVOR_PRESETS = [
  { key: 'feishu', pri: '#3370ff', chrome: '#ffffff', surface2: '#f2f3f5' },
  { key: 'claude', pri: '#d97757', chrome: '#faf9f5', surface2: '#f5f0e8' }, // clay 对齐 ACCENTS/tokens 官方值（原型旧值 #cc785c）
  { key: 'shadcn', pri: '#18181b', chrome: '#ffffff', surface2: '#f4f4f5' },
] as const;

// 自定义取色 tile 的彩虹底（原型 customAccentTileStyle L4964）；含十六进制，放 .ts 承载，组件 style 消费。
export const CUSTOM_ACCENT_GRADIENT =
  'conic-gradient(from 180deg, #f53f3f, #ff8000, #16a34a, #0891b2, #3370ff, #7c3aed, #db2777, #f53f3f)';

// 十六进制校验（#rgb 或 #rrggbb）：自定义取色非法时不写 DOM，防 rgba(NaN,…)
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
export function isValidHex(hex: string): boolean {
  return HEX_RE.test(hex);
}

const FLAVOR_DEFAULT_ACCENT: Record<Flavor, AccentKey> = {
  feishu: 'blue',
  claude: 'claude',
  shadcn: 'shadcn',
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

const LIGHT_ON_PRIMARY = '#ffffff';
const DARK_ON_PRIMARY = '#18181b';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

function toLinearChannel(value: number): number {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * toLinearChannel(r) + 0.7152 * toLinearChannel(g) + 0.0722 * toLinearChannel(b);
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function foregroundForBackground(hex: string): string {
  return contrastRatio(hex, DARK_ON_PRIMARY) > contrastRatio(hex, LIGHT_ON_PRIMARY)
    ? DARK_ON_PRIMARY
    : LIGHT_ON_PRIMARY;
}

export interface AppearanceState {
  flavor: Flavor;
  mode: Mode;
  accent: AccentKey;
  customAccent: string;
  zoom: Zoom;
  radius: Radius;
}

// 解析主题色 → 注入用的 --pri / --pri-active / --pri-soft / --on-pri。耦合规则（原型 L4798-4803）：暗色下 soft 交还 CSS 白 alpha（返回 null）。
// 自定义色非法时回退经典蓝，防 rgba(NaN,…)。此函数是 applyAppearance 与 FOUC 派生值的共同真相源。
export function resolveAccentVars(s: AppearanceState): {
  pri: string;
  priActive: string | null;
  soft: string | null;
  onPri: string;
} {
  if (s.accent === 'custom') {
    const valid = isValidHex(s.customAccent);
    const pri = valid ? s.customAccent : ACCENTS[0].pri;
    const soft = valid ? hexToSoft(s.customAccent) : ACCENTS[0].soft;
    return { pri, priActive: null, soft: s.mode === 'light' ? soft : null, onPri: foregroundForBackground(pri) };
  }
  const acc = ACCENTS.find((a) => a.key === s.accent) ?? ACCENTS[0];
  const pri = s.mode === 'dark' && 'priDark' in acc ? acc.priDark : acc.pri;
  const priActive = s.mode === 'light' && 'active' in acc ? acc.active : null;
  const onPri = 'onPri' in acc ? acc.onPri : foregroundForBackground(pri);
  return { pri, priActive, soft: s.mode === 'light' ? acc.soft : null, onPri };
}

export function applyAppearance(s: AppearanceState): void {
  const el = document.documentElement;
  el.dataset.flavor = s.flavor;
  el.dataset.mode = s.mode;
  if (s.radius === 'default') delete el.dataset.radius;
  else el.dataset.radius = s.radius;
  if (s.zoom === 'md') delete el.dataset.zoom;
  else el.dataset.zoom = s.zoom;
  const { pri, priActive, soft, onPri } = resolveAccentVars(s);
  el.style.setProperty('--pri', pri);
  el.style.setProperty('--on-pri', onPri);
  if (priActive) el.style.setProperty('--pri-active', priActive);
  else el.style.removeProperty('--pri-active');
  if (soft) el.style.setProperty('--pri-soft', soft);
  else el.style.removeProperty('--pri-soft');
}
