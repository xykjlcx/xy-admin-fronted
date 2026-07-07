import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

// field 组件水平内距必须消费 --field-px（密度轴），不得回退硬编码 px-3 / px-2.5。
// 读源码文本断言，与 theme-guards / tokens.snapshot 的确定性守卫同哲学。
const FIELD_FILES = [
  'src/components/ui/input.tsx',
  'src/components/ui/native-select.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/textarea.tsx',
];

describe('field 密度：水平内距走 --field-px', () => {
  test.each(FIELD_FILES)('%s 消费 --field-px', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).toContain('px-(--field-px)');
  });

  // 强断言：field 文件内不得残留任何裸 px-3（含 InputGroupAddon 的 `border-r px-3`）。
  // 旧写法 not.toContain('border px-3') 抓不到 `border-r px-3`（中间是 -r），会放行 addon；
  // 改用正则精确匹配裸 px-3，负向前瞻 (?![\d.]) 避免误伤 px-3.5 之类（当前 field 文件无此变体）。
  test.each(FIELD_FILES)('%s 无残留硬编码 px-3', (file) => {
    const src = readFileSync(file, 'utf8');
    expect(src).not.toMatch(/px-3(?![\d.])/);
  });

  test('SearchField 去除 px-2.5，改由 InputGroup 的 --field-px 提供内距', () => {
    const src = readFileSync('src/components/pro/SearchField.tsx', 'utf8');
    expect(src).not.toContain('px-2.5');
  });
});
