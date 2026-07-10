import { screen, waitFor, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { vi } from 'vitest';
import type { MenusViewProps } from '@/modules/admin/menus';
import { chooseSelectOption, getTreeNodeButton, renderMenusView } from './menus-view.test-kit';

test('admin 可以新增菜单节点', async () => {
  const onCreateMenu = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onCreateMenu });

  await userEvent.click(screen.getByRole('button', { name: '新增菜单' }));
  await chooseSelectOption('节点类型', '菜单');
  await chooseSelectOption('父级菜单', '组织与权限');
  await userEvent.type(screen.getByLabelText('菜单名称'), '菜单配置');
  await chooseSelectOption('路由路径', '成员与部门 · /admin/users');
  await userEvent.type(screen.getByLabelText('权限标识'), 'iam:menu:view');
  await userEvent.click(screen.getByRole('button', { name: '确定新增' }));

  expect(onCreateMenu).toHaveBeenCalledWith({
    subsystemKey: 'admin',
    parentId: 'm-org',
    type: 'menu',
    label: { 'zh-CN': '菜单配置' },
    icon: '',
    shortLabel: undefined,
    path: '/admin/users',
    permission: 'iam:menu:view',
    visible: true,
    sort: 3,
  });
});

test('新增菜单中切换两个下拉控件时不会关闭弹窗', async () => {
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  renderMenusView({ permissions: ['*:*:*'] });

  await user.click(screen.getByRole('button', { name: '新增菜单' }));
  await user.click(screen.getByRole('combobox', { name: '节点类型' }));
  await user.click(await screen.findByRole('option', { name: '菜单' }));
  await user.click(screen.getByRole('combobox', { name: '图标' }));
  expect(await screen.findByRole('option', { name: '默认图标' })).toBeInTheDocument();
  await user.click(screen.getByText('请选择路由'));

  expect(document.body.querySelector('[data-slot="dialog-content"]')).toBeInTheDocument();
});

test('admin 使用统一菜单弹窗编辑已有菜单', async () => {
  const onUpdateMenu = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onUpdateMenu });

  await userEvent.click(getTreeNodeButton('企业概览'));
  await userEvent.click(screen.getByRole('button', { name: '编辑企业概览' }));
  const dialog = screen.getByRole('dialog', { name: '编辑菜单' });
  await userEvent.clear(within(dialog).getByLabelText('权限标识'));
  await userEvent.type(within(dialog).getByLabelText('权限标识'), 'dashboard:read');
  await userEvent.click(within(dialog).getByRole('button', { name: '保存菜单' }));

  expect(onUpdateMenu).toHaveBeenCalledWith(
    'm-dashboard',
    expect.objectContaining({ path: '/admin/dashboard', permission: 'dashboard:read' }),
  );
});

test('菜单表单弹窗使用标准中号操作按钮', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  await userEvent.click(screen.getByRole('button', { name: '新增菜单' }));
  const dialog = screen.getByRole('dialog', { name: '新增菜单' });
  expect(within(dialog).getByRole('button', { name: '取消' })).toHaveAttribute('data-size', 'md');
  expect(within(dialog).getByRole('button', { name: '确定新增' })).toHaveAttribute('data-size', 'md');
});

test('统一编辑表单保留双语菜单的 label/shortLabel', async () => {
  const onUpdateMenu = vi.fn();
  const bilingualMenus = [
    {
      id: 'm-home',
      parentId: null,
      subsystemKey: 'admin',
      type: 'dir',
      label: { 'zh-CN': '工作台', 'en-US': 'Workspace' },
      shortLabel: { 'zh-CN': '工作台', 'en-US': 'Workspace' },
      icon: 'layout-dashboard',
      visible: true,
      sort: 1,
    },
  ] satisfies MenusViewProps['menus'];
  renderMenusView({ permissions: ['*:*:*'], menus: bilingualMenus, onUpdateMenu });

  await userEvent.click(screen.getByRole('button', { name: '编辑工作台' }));
  const dialog = screen.getByRole('dialog', { name: '编辑菜单' });
  await userEvent.clear(within(dialog).getByLabelText('排序'));
  await userEvent.type(within(dialog).getByLabelText('排序'), '2');
  await userEvent.click(within(dialog).getByRole('button', { name: '保存菜单' }));

  expect(onUpdateMenu).toHaveBeenCalledWith(
    'm-home',
    expect.objectContaining({
      label: { 'zh-CN': '工作台', 'en-US': 'Workspace' },
      shortLabel: { 'zh-CN': '工作台', 'en-US': 'Workspace' },
      sort: 2,
    }),
  );
});

test('菜单保存失败时保留统一编辑弹窗', async () => {
  const onUpdateMenu = vi.fn().mockRejectedValue(new Error('boom'));
  renderMenusView({ permissions: ['*:*:*'], onUpdateMenu });

  await userEvent.click(getTreeNodeButton('企业概览'));
  await userEvent.click(screen.getByRole('button', { name: '编辑企业概览' }));
  const dialog = screen.getByRole('dialog', { name: '编辑菜单' });
  await userEvent.click(within(dialog).getByRole('button', { name: '保存菜单' }));

  expect(onUpdateMenu).toHaveBeenCalled();
  expect(screen.getByRole('dialog', { name: '编辑菜单' })).toBeInTheDocument();
});

test('菜单表单提交在途时禁用保存按钮', async () => {
  let release!: () => void;
  const onCreateMenu = vi.fn(
    () => new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  renderMenusView({ permissions: ['*:*:*'], onCreateMenu });

  await userEvent.click(screen.getByRole('button', { name: '新增菜单' }));
  await userEvent.type(screen.getByLabelText('菜单名称'), '新目录');
  const saveButton = screen.getByRole('button', { name: '确定新增' });
  await userEvent.click(saveButton);

  expect(saveButton).toBeDisabled();
  expect(onCreateMenu).toHaveBeenCalledTimes(1);
  release();
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '新增菜单' })).not.toBeInTheDocument());
});
