// 确定性验收（spec §13.1）：jsdom 不解析 CSS 文件，直接读 tokens.css 文本断言字面值。
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf8');

// 权威值表：原型 L4796-4805 逐字对照，全表逐值断言（tokens.css 全部变量声明，无抽样遗漏）。
// 静态硬编码，非运行时从 tokens.css 提取——否则文件怎么改断言都跟着变，失去守护意义。
// 每条含结尾分号，避免数值前缀碰撞误判（如 "--radius-factor: 1" 会被 "--radius-factor: 1.55" 误判命中）。
const MUST_CONTAIN = [
  // :root, [data-flavor='feishu'][data-mode='light']
  '--pri: #3370ff;',
  '--pri-soft: #eef3ff;',
  '--bg: #f5f6f7;',
  '--canvas: #eceef1;',
  '--surface: #ffffff;',
  '--chrome: #ffffff;',
  '--surface-2: #f2f3f5;',
  '--surface-blur: rgba(255, 255, 255, 0.72);',
  '--text: #1f2329;',
  '--text-2: #4e5969;',
  '--text-3: #8f959e;',
  '--border: #e5e6eb;',
  // [data-flavor='feishu'][data-mode='dark']
  '--pri-soft: rgba(255, 255, 255, 0.08);',
  '--bg: #111318;',
  '--canvas: #0c0d10;',
  '--surface: #1b1d23;',
  '--chrome: #16181d;',
  '--surface-2: #262931;',
  '--surface-blur: rgba(27, 29, 35, 0.72);',
  '--text: #e7e9ec;',
  '--text-2: #a3aab3;',
  '--text-3: #7a818b;',
  '--border: #2c2f38;',
  // [data-flavor='claude'][data-mode='light']
  '--bg: #f0eee6;',
  '--canvas: #e7e3d7;',
  '--surface: #fdfcf8;',
  '--chrome: #f4f1e8;',
  '--surface-2: #efece1;',
  '--surface-blur: rgba(244, 241, 232, 0.78);',
  '--text: #2a2521;',
  '--text-2: #6b6459;',
  '--text-3: #978f80;',
  '--border: #e5e0d3;',
  // [data-flavor='claude'][data-mode='dark']
  '--pri-soft: rgba(255, 255, 255, 0.09);',
  '--bg: #1c1917;',
  '--canvas: #161311;',
  '--surface: #262220;',
  '--chrome: #211d1a;',
  '--surface-2: #302b27;',
  '--surface-blur: rgba(33, 29, 26, 0.78);',
  '--text: #ece6dd;',
  '--text-2: #a89f92;',
  '--text-3: #7d7568;',
  '--border: #3a342e;',
  // :root（语义色 / --pri-hover / 圆角公式）
  '--pri-hover: color-mix(in srgb, var(--pri) 85%, black);',
  '--success: #16a34a;',
  '--success-soft: #e8f7ee;',
  '--warning: #ff8000;',
  '--warning-soft: #fff3e8;',
  '--danger: #f53f3f;',
  '--danger-soft: #feecec;',
  '--radius-factor: 1;',
  '--radius-sm: calc(6px * var(--radius-factor));',
  '--radius-md: calc(8px * var(--radius-factor));',
  '--radius-lg: calc(12px * var(--radius-factor));',
  '--radius-xl: calc(14px * var(--radius-factor));',
  // [data-radius='sharp'] / [data-radius='round']
  '--radius-factor: 0.28;',
  '--radius-factor: 1.55;',
];
test.each(MUST_CONTAIN)('token %s 与原型一致', (t) => expect(css).toContain(t));

test('圆角因子三档 + 四条 calc 公式', () => {
  expect(css).toContain('--radius-factor: 1;'); // 默认档
  expect(css).toContain('--radius-factor: 0.28;'); // sharp
  expect(css).toContain('--radius-factor: 1.55;'); // round
  expect(css).toContain('--radius-sm: calc(6px * var(--radius-factor));');
  expect(css).toContain('--radius-md: calc(8px * var(--radius-factor));');
  expect(css).toContain('--radius-lg: calc(12px * var(--radius-factor));');
  expect(css).toContain('--radius-xl: calc(14px * var(--radius-factor));');
});

// 锁 FOUC 脚本与 store 的三点契约不被静默删除：localStorage key 'appearance' +
// dataset.flavor / dataset.mode 写入，避免首屏闪烁（FOUC）回归。
test('index.html FOUC 脚本三点契约不被静默删除', () => {
  const html = readFileSync('index.html', 'utf8');
  expect(html).toContain('appearance');
  expect(html).toContain('dataset.flavor');
  expect(html).toContain('dataset.mode');
});
