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

test('Tree owns expand, hidden-row, leading and trailing presentation', async () => {
  const onToggle = vi.fn();

  render(
    <Tree
      nodes={[
        {
          id: 'root',
          label: '系统管理',
          depth: 0,
          expandable: true,
          expanded: false,
          toggleLabel: '展开或折叠系统管理',
          leading: <span>图标</span>,
          trailing: <span>目录</span>,
        },
        { id: 'child', label: '菜单管理', depth: 1, hidden: true },
      ]}
      selectedId="root"
      onSelect={() => undefined}
      onToggle={onToggle}
      ariaLabel="菜单树"
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: '展开或折叠系统管理' }));
  expect(onToggle).toHaveBeenCalledWith('root');
  expect(screen.getByText('图标')).toBeInTheDocument();
  expect(screen.getByText('目录')).toBeInTheDocument();
  expect(screen.getByText('菜单管理').closest('[data-tree-row]')).toHaveAttribute(
    'data-collapsed-hidden',
    'true',
  );
});

test('Tree supports a management list variant with supporting descriptions', () => {
  render(
    <Tree
      variant="management"
      nodes={[
        {
          id: 'menu-files',
          label: '文件管理',
          description: 'm-files',
          depth: 0,
          leading: <span>图标</span>,
          trailing: <span>菜单</span>,
        },
      ]}
      selectedId="menu-files"
      onSelect={() => undefined}
      ariaLabel="菜单导航树"
    />,
  );

  const tree = screen.getByRole('tree', { name: '菜单导航树' });
  expect(tree).toHaveAttribute('data-variant', 'management');
  expect(tree).toHaveClass('bg-(--table-bg)', 'border-(--table-border)');
  expect(screen.getByText('m-files')).toHaveAttribute('data-slot', 'tree-description');
  expect(screen.getByRole('treeitem', { name: '文件管理 m-files' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
