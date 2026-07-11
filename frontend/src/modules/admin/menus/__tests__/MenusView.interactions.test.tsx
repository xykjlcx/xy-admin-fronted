import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { getTreeNodeButton, renderMenusView } from './menus-view.test-kit';

test('搜索只过滤本地树表，不触发子系统切换', async () => {
  const { onActiveSubsystemChange } = renderMenusView();

  await userEvent.type(screen.getByPlaceholderText('搜索菜单名称、路由、权限标识'), '角色');

  expect(screen.getByText('角色与权限')).toBeInTheDocument();
  expect(screen.queryByText('企业概览')).not.toBeInTheDocument();
  expect(onActiveSubsystemChange).not.toHaveBeenCalled();
});

test('菜单搜索使用通用 SearchField', () => {
  renderMenusView();

  const input = screen.getByRole('searchbox', { name: '搜索菜单' });
  expect(input.closest('[data-slot="input-group"]')).toContainElement(input);
});

test('菜单树批量折叠按钮根据全局折叠状态自动切换', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  expect(screen.getByRole('button', { name: '折叠' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '折叠' }));
  expect(screen.getByRole('button', { name: '展开' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '展开' }));
  expect(screen.getByRole('button', { name: '折叠' })).toBeInTheDocument();
  expect(screen.getByText('企业概览')).toBeInTheDocument();
});

test('admin 可以切换菜单显示状态', async () => {
  const onSetMenuVisibility = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onSetMenuVisibility });

  await userEvent.click(getTreeNodeButton('企业概览'));
  const visibilitySwitch = screen.getByRole('switch', { name: '切换企业概览显示状态' });
  expect(visibilitySwitch).toHaveAttribute('data-state', 'checked');

  await userEvent.click(visibilitySwitch);
  expect(onSetMenuVisibility).toHaveBeenCalledWith('m-dashboard', false);
});

test('菜单树折叠后向子节点暴露隐藏状态', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const childRow = screen.getByText('成员与部门').closest('[data-tree-row]');
  expect(childRow).not.toHaveAttribute('data-collapsed-hidden');

  await userEvent.click(screen.getByRole('button', { name: '展开或折叠组织与权限' }));
  expect(childRow).toHaveAttribute('data-collapsed-hidden', 'true');
  expect(childRow?.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
});

test('只有无子节点菜单才提供删除入口', async () => {
  const onDeleteMenu = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onDeleteMenu });

  await userEvent.click(getTreeNodeButton('组织与权限'));
  const inspector = screen.getByRole('complementary', { name: '节点详情' });
  expect(within(inspector).queryByRole('button', { name: '删除组织与权限' })).not.toBeInTheDocument();

  await userEvent.click(getTreeNodeButton('企业概览'));
  await userEvent.click(within(inspector).getByRole('button', { name: '删除企业概览' }));
  await userEvent.click(screen.getByRole('button', { name: '确认删除' }));

  expect(onDeleteMenu).toHaveBeenCalledWith('m-dashboard');
});

test('详情抽屉通过统一菜单弹窗承载编辑', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  await userEvent.click(getTreeNodeButton('企业概览'));
  await userEvent.click(screen.getByRole('button', { name: '节点详情' }));

  const sheet = await screen.findByRole('dialog', { name: '菜单详情' });
  expect(within(sheet).getByRole('button', { name: '新增操作' })).toBeInTheDocument();
  await userEvent.click(within(sheet).getByRole('button', { name: '编辑企业概览' }));

  expect(screen.queryByRole('dialog', { name: '菜单详情' })).not.toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: '编辑菜单' })).toBeInTheDocument();
});
