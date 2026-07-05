import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Tree, type TreeNode } from '@/components/pro/Tree';

const nodes: TreeNode[] = [
  { id: 'root', label: '全部部门', depth: 0, meta: '42' },
  { id: 'rd', label: '研发中心', depth: 1, meta: '18' },
  { id: 'ops', label: '运营部', depth: 2 },
];

test('Tree renders a controlled hierarchical tree with selection and meta', async () => {
  const onSelect = vi.fn();

  render(
    <Tree
      nodes={nodes}
      selectedId="rd"
      onSelect={onSelect}
      ariaLabel="部门树"
    />,
  );

  expect(screen.getByRole('tree', { name: '部门树' })).toBeInTheDocument();
  expect(screen.getAllByRole('treeitem')).toHaveLength(nodes.length);
  expect(screen.getByRole('treeitem', { name: '全部部门 42' })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByRole('treeitem', { name: '研发中心 18' })).toHaveAttribute('aria-selected', 'true');

  const nestedNode = screen.getByRole('treeitem', { name: '运营部' });
  expect(nestedNode).toHaveStyle({ paddingLeft: 'calc(48px * var(--app-scale))' });

  await userEvent.click(screen.getByRole('treeitem', { name: '运营部' }));
  expect(onSelect).toHaveBeenCalledWith('ops');
});

test('Tree stays business agnostic and delegates all copy through props', () => {
  const source = readFileSync('src/components/pro/Tree.tsx', 'utf8');

  expect(source).not.toContain('@/modules/');
  expect(source).not.toContain('useTranslation');
  expect(source).not.toContain('TableShell');
  expect(source).not.toContain('TableTreeCell');
  expect(source).not.toContain('transition-colors');
});
