import {
  applyAppearance,
  hexToSoft,
  flavorDefaultAccent,
  isValidHex,
  resolveAccentVars,
  ACCENTS,
} from '@/lib/appearance-dom';

const base = {
  flavor: 'feishu',
  mode: 'light',
  accent: 'blue',
  customAccent: '#000000',
  zoom: 'md',
  radius: 'default',
} as const;

test('亮色注入预设 soft', () => {
  applyAppearance({ ...base });
  expect(document.documentElement.style.getPropertyValue('--pri')).toBe('#3370ff');
  expect(document.documentElement.style.getPropertyValue('--pri-soft')).toBe('#eef3ff');
});
test('暗色不注入 soft（耦合规则：交还 CSS 的白 alpha）', () => {
  applyAppearance({ ...base, mode: 'dark' });
  expect(document.documentElement.style.getPropertyValue('--pri-soft')).toBe('');
});
test('自定义色 soft 公式', () => {
  expect(hexToSoft('#c96442')).toBe('rgba(201,100,66,.12)');
});
test('claude flavor 默认陶土橙', () => {
  expect(flavorDefaultAccent('claude')).toBe('claude');
});
test('default 档 radius/zoom 不写入 dataset（先设非默认再切回验证 delete）', () => {
  applyAppearance({ ...base, radius: 'sharp', zoom: 'lg' });
  expect('radius' in document.documentElement.dataset).toBe(true);
  expect('zoom' in document.documentElement.dataset).toBe(true);
  applyAppearance({ ...base });
  expect('radius' in document.documentElement.dataset).toBe(false);
  expect('zoom' in document.documentElement.dataset).toBe(false);
});
test('hexToSoft 3 位缩写展开', () => {
  expect(hexToSoft('#abc')).toBe('rgba(170,187,204,.12)');
});
test('applyAppearance 写入 dataset.flavor/mode', () => {
  applyAppearance({ ...base, flavor: 'claude', mode: 'dark' });
  expect(document.documentElement.dataset.flavor).toBe('claude');
  expect(document.documentElement.dataset.mode).toBe('dark');
});

// ACCENTS 色名走 i18n key（不硬编码中文，随语言切换），labelKey 对应 shell.appearanceDrawer.<labelKey> 词条
test('ACCENTS 四预设均有 labelKey（非硬编码中文）', () => {
  expect(ACCENTS.map((a) => a.labelKey)).toEqual([
    'accentBlue',
    'accentClaude',
    'accentGreen',
    'accentViolet',
  ]);
});

// Task 14 待办②：自定义取色 hex 校验
test('isValidHex 校验 #rgb / #rrggbb', () => {
  expect(isValidHex('#c96442')).toBe(true);
  expect(isValidHex('#abc')).toBe(true);
  expect(isValidHex('c96442')).toBe(false);
  expect(isValidHex('#xyz')).toBe(false);
  expect(isValidHex('')).toBe(false);
});

test('resolveAccentVars：亮色含 soft，暗色 soft 交还 CSS（null）', () => {
  expect(resolveAccentVars({ ...base })).toEqual({ pri: '#3370ff', soft: '#eef3ff' });
  expect(resolveAccentVars({ ...base, mode: 'dark' })).toEqual({ pri: '#3370ff', soft: null });
});

test('resolveAccentVars：非法自定义色回退经典蓝，不产 rgba(NaN)', () => {
  const r = resolveAccentVars({ ...base, accent: 'custom', customAccent: 'not-a-color' });
  expect(r).toEqual({ pri: '#3370ff', soft: '#eef3ff' });
});

test('resolveAccentVars：合法自定义色走 soft 公式', () => {
  expect(resolveAccentVars({ ...base, accent: 'custom', customAccent: '#c96442' })).toEqual({
    pri: '#c96442',
    soft: 'rgba(201,100,66,.12)',
  });
});
