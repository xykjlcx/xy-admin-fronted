import { render, screen, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { beforeAll, vi } from 'vitest';
import { i18nInit } from '@/lib/i18n';
import { MenusView, type MenusViewProps } from '@/modules/admin/pages/menus';

beforeAll(async () => {
  await i18nInit;
});

async function chooseSelectOption(label: string, optionName: string) {
  await userEvent.click(screen.getByRole('combobox', { name: label }));
  await userEvent.click(await screen.findByRole('option', { name: optionName }));
}

const subsystemsFixture = [
  {
    key: 'admin',
    label: { 'zh-CN': '后台管理' },
    desc: { 'zh-CN': '组织 · 权限 · 审计' },
    icon: 'layout-grid',
    color: '#3370ff',
    home: '/admin/dashboard',
    builtin: true,
    enabled: true,
    sort: 1,
  },
] satisfies MenusViewProps['subsystems'];

const menusFixture = [
  {
    id: 'm-home',
    parentId: null,
    subsystemKey: 'admin',
    type: 'dir',
    label: { 'zh-CN': '工作台' },
    shortLabel: { 'zh-CN': '工作台' },
    icon: 'layout-dashboard',
    visible: true,
    sort: 1,
  },
  {
    id: 'm-dashboard',
    parentId: 'm-home',
    subsystemKey: 'admin',
    type: 'menu',
    label: { 'zh-CN': '企业概览' },
    path: '/admin/dashboard',
    permission: 'dashboard:view',
    visible: true,
    sort: 1,
  },
  {
    id: 'm-org',
    parentId: null,
    subsystemKey: 'admin',
    type: 'dir',
    label: { 'zh-CN': '组织与权限' },
    shortLabel: { 'zh-CN': '组织' },
    icon: 'users',
    visible: true,
    sort: 2,
  },
  {
    id: 'm-users',
    parentId: 'm-org',
    subsystemKey: 'admin',
    type: 'menu',
    label: { 'zh-CN': '成员与部门' },
    path: '/admin/users',
    permission: 'iam:user:view',
    visible: true,
    sort: 1,
  },
  {
    id: 'm-roles',
    parentId: 'm-org',
    subsystemKey: 'admin',
    type: 'menu',
    label: { 'zh-CN': '角色与权限' },
    path: '/admin/roles',
    permission: 'iam:role:view',
    visible: true,
    sort: 2,
  },
  {
    id: 'a-user-export',
    parentId: 'm-users',
    subsystemKey: 'admin',
    type: 'action',
    label: { 'zh-CN': '导出成员' },
    permission: 'iam:user:export',
    visible: true,
    sort: 1,
  },
] satisfies MenusViewProps['menus'];

function makeHandlers() {
  return {
    onActiveSubsystemChange: vi.fn(),
    onCreateMenu: vi.fn(),
    onUpdateMenu: vi.fn(),
    onDeleteMenu: vi.fn(),
    onSetMenuVisibility: vi.fn(),
  };
}

function renderMenusView(props: Partial<MenusViewProps> = {}) {
  const handlers = makeHandlers();
  return {
    ...handlers,
    ...render(
      <MenusView
        {...handlers}
        permissions={['iam:menu:view']}
        subsystems={subsystemsFixture}
        activeSubsystemKey="admin"
        menus={menusFixture}
        {...props}
      />,
    ),
  };
}

test('viewer 能看子系统区和菜单树，但看不到写操作', () => {
  renderMenusView();

  expect(screen.getByText('子系统管理')).toBeInTheDocument();
  expect(screen.getByText('后台管理 · 菜单树')).toBeInTheDocument();
  expect(screen.getByText('企业概览')).toBeInTheDocument();
  expect(screen.getByText('导出成员')).toBeInTheDocument();
  expect(screen.getByText('菜单名称')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新增菜单' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '编辑企业概览' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '删除企业概览' })).not.toBeInTheDocument();
});

test('搜索只过滤本地树表，不触发子系统切换', async () => {
  const { onActiveSubsystemChange } = renderMenusView();

  await userEvent.type(screen.getByPlaceholderText('搜索菜单名称、路由、权限标识'), '角色');

  expect(screen.getByText('角色与权限')).toBeInTheDocument();
  expect(screen.queryByText('企业概览')).not.toBeInTheDocument();
  expect(onActiveSubsystemChange).not.toHaveBeenCalled();
});

test('菜单搜索使用业务 SearchField 而不是页面内联输入框', () => {
  renderMenusView();

  const input = screen.getByRole('searchbox', { name: '搜索菜单' });
  const group = input.closest('[data-slot="input-group"]');

  expect(group).toBeInTheDocument();
  expect(group).toHaveClass('ui-field');
  expect(group).not.toHaveClass('border-[var(--field-border)]');
  expect(group).not.toHaveClass('focus-within:ring-[length:var(--focus-ring)]');
});

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
  expect(document.body).toHaveTextContent('新增菜单');
});

test('admin 可以编辑已有菜单', async () => {
  const onUpdateMenu = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onUpdateMenu });

  await userEvent.click(screen.getByRole('button', { name: '编辑企业概览' }));
  const dialog = screen.getByRole('dialog', { name: '编辑菜单' });
  await userEvent.clear(within(dialog).getByLabelText('菜单名称'));
  await userEvent.type(within(dialog).getByLabelText('菜单名称'), '经营总览');
  await userEvent.click(within(dialog).getByRole('button', { name: '保存菜单' }));

  expect(onUpdateMenu).toHaveBeenCalledWith(
    'm-dashboard',
    expect.objectContaining({
      label: { 'zh-CN': '经营总览' },
      path: '/admin/dashboard',
      permission: 'dashboard:view',
    }),
  );
});

test('admin 可以切换菜单显示状态', async () => {
  const onSetMenuVisibility = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onSetMenuVisibility });

  await userEvent.click(screen.getByRole('switch', { name: '切换企业概览显示状态' }));

  expect(onSetMenuVisibility).toHaveBeenCalledWith('m-dashboard', false);
});

test('admin 可以删除叶子菜单，非叶子目录不显示删除入口', async () => {
  const onDeleteMenu = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onDeleteMenu });

  expect(screen.queryByRole('button', { name: '删除组织与权限' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '删除企业概览' }));
  await userEvent.click(screen.getByRole('button', { name: '确认删除' }));

  expect(onDeleteMenu).toHaveBeenCalledWith('m-dashboard');
});
