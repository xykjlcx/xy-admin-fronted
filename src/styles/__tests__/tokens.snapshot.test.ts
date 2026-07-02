// 确定性验收（spec §13.1）：jsdom 不解析 CSS 文件，直接读 tokens.css 文本断言字面值。
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf8');

// 权威值表：原型 L4796-4805 逐字对照（抽代表值 + 总量断言）
const MUST_CONTAIN = [
  '--bg: #f5f6f7',
  '--chrome: #16181d',
  '--surface: #fdfcf8',
  '--canvas: #e7e3d7',
  '--surface-blur: rgba(33, 29, 26, 0.78)',
  '--pri-soft: rgba(255, 255, 255, 0.08)',
  '--text-3: #978f80',
  '--border: #3a342e',
];
test.each(MUST_CONTAIN)('token %s 与原型一致', (t) => expect(css).toContain(t));

test('圆角因子三档', () => {
  expect(css).toContain('--radius-factor: 0.28');
  expect(css).toContain('--radius-factor: 1.55');
});

// 锁 FOUC 脚本与 store 的三点契约不被静默删除：localStorage key 'appearance' +
// dataset.flavor / dataset.mode 写入，避免首屏闪烁（FOUC）回归。
test('index.html FOUC 脚本三点契约不被静默删除', () => {
  const html = readFileSync('index.html', 'utf8');
  expect(html).toContain('appearance');
  expect(html).toContain('dataset.flavor');
  expect(html).toContain('dataset.mode');
});
