import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

// 表格几何必须消费 --table-* 密度 token，不得回退硬编码 h-11/h-14/px-2/px-3/py-[Npx]。
// 读源码文本断言，与 theme-guards / tokens.snapshot 的确定性守卫同哲学。
describe('table 密度：行高与内距走 --table-* token', () => {
  test('ui/table.tsx 消费 --table-header-h / --table-row-h / --table-cell-px', () => {
    const src = readFileSync('src/components/ui/table.tsx', 'utf8');
    expect(src).toContain('h-(--table-header-h)');
    expect(src).toContain('h-(--table-row-h)');
    expect(src).toContain('px-(--table-cell-px)');
  });

  test('ui/table.tsx 无残留硬编码 h-11 / px-3 / py-[..px]', () => {
    const src = readFileSync('src/components/ui/table.tsx', 'utf8');
    expect(src).not.toMatch(/\bh-11\b/);
    expect(src).not.toMatch(/px-3(?![\d.])/);
    expect(src).not.toMatch(/py-\[calc\(10px/);
  });

  test('DataTable.tsx 无残留 py-[12.5px] 撑高（行高改由固定行高统一）', () => {
    const src = readFileSync('src/components/pro/DataTable.tsx', 'utf8');
    expect(src).not.toMatch(/py-\[calc\(12\.5px/);
  });

  test('TableShell.tsx 消费 --table-header-h / --table-row-h / --table-cell-px', () => {
    const src = readFileSync('src/components/pro/TableShell.tsx', 'utf8');
    expect(src).toContain('h-(--table-header-h)');
    expect(src).toContain('h-(--table-row-h)');
    expect(src).toContain('px-(--table-cell-px)');
  });

  test('TableShell.tsx 无残留硬编码 h-11 / h-14 / px-2', () => {
    const src = readFileSync('src/components/pro/TableShell.tsx', 'utf8');
    expect(src).not.toMatch(/\bh-11\b/);
    expect(src).not.toMatch(/\bh-14\b/);
    expect(src).not.toMatch(/px-2(?![\d.])/);
  });
});
