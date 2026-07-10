import { render, screen, waitFor, within } from '@testing-library/react';
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

function getTreeNodeButton(name: string) {
  const node = screen
    .getAllByRole('button', { name: new RegExp(name) })
    .find((button) => button.getAttribute('aria-pressed') !== null);
  if (!node) {
    throw new Error(`Menu tree node not found: ${name}`);
  }
  return node;
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
  {
    key: 'warehouse',
    label: { 'zh-CN': '仓储系统' },
    desc: { 'zh-CN': '库存 · 波次 · 拣货' },
    icon: 'folder',
    color: '#00b3a4',
    home: '/admin/dashboard',
    builtin: false,
    enabled: true,
    sort: 2,
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
    onCreateSubsystem: vi.fn(),
    onCreateMenu: vi.fn(),
    onUpdateMenu: vi.fn(),
    onDeleteMenu: vi.fn(),
    onSetMenuVisibility: vi.fn(),
    onUpdateSubsystem: vi.fn(),
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

  expect(screen.getByRole('complementary', { name: '子系统列表' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: '后台管理菜单树' })).toBeInTheDocument();
  expect(screen.getByText('企业概览')).toBeInTheDocument();
  expect(screen.getByText('导出成员')).toBeInTheDocument();
  expect(screen.getByText('菜单名称')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新增菜单' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新增子系统' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '编辑企业概览' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '删除企业概览' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '编辑后台管理子系统' })).not.toBeInTheDocument();
});

test('菜单管理采用左侧子系统列表、中间菜单树和右侧节点详情', () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const subsystemList = screen.getByRole('complementary', { name: '子系统列表' });
  const menuTreePanel = screen.getByRole('region', { name: '后台管理菜单树' });
  const inspector = screen.getByRole('complementary', { name: '节点详情' });

  expect(subsystemList).toHaveClass('w-[calc(248px*var(--app-scale))]');
  expect(subsystemList).toHaveClass('border-r');
  expect(menuTreePanel).toHaveClass('min-w-0');
  expect(menuTreePanel).toHaveClass('flex-1');
  expect(menuTreePanel).toHaveClass('border-l');
  expect(menuTreePanel).toHaveClass('border-(--page-inset-section-divider)');
  expect(inspector).toHaveClass('border-l');
  expect(inspector).toHaveClass('border-(--page-section-divider)');
  expect(within(subsystemList).getByRole('button', { name: '选择后台管理子系统' })).toBeInTheDocument();
  expect(within(subsystemList).getByRole('button', { name: '选择仓储系统子系统' })).toBeInTheDocument();
  expect(within(subsystemList).getByRole('button', { name: '新增子系统' })).toBeInTheDocument();
  expect(within(menuTreePanel).getByText('菜单名称')).toBeInTheDocument();
  expect(within(menuTreePanel).queryByText('操作')).not.toBeInTheDocument();
  expect(within(inspector).getByText('工作台')).toBeInTheDocument();
  expect(within(inspector).getByText('目录')).toHaveClass('bg-(--accent-emphasis-soft)');

  expect(screen.getByTestId('menu-management-surface')).toHaveClass('min-h-[calc(100dvh-138px)]');
});

test('点击菜单树节点后右侧详情面板展示该节点配置', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  await userEvent.click(getTreeNodeButton('角色与权限'));

  const inspector = screen.getByRole('complementary', { name: '节点详情' });
  expect(within(inspector).getByText('角色与权限')).toBeInTheDocument();
  expect(within(inspector).getByText('/admin/roles')).toBeInTheDocument();
  expect(within(inspector).getByText('iam:role:view')).toBeInTheDocument();
  expect(within(inspector).getByText('菜单')).toHaveClass('bg-success-soft');
});

test('admin 可以从子系统卡片编辑入口保存子系统显示信息', async () => {
  const onUpdateSubsystem = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onUpdateSubsystem } as Partial<MenusViewProps>);

  await userEvent.click(screen.getByRole('button', { name: '编辑后台管理子系统' }));
  const dialog = screen.getByRole('dialog', { name: '编辑子系统' });
  await userEvent.clear(within(dialog).getByLabelText('子系统名称'));
  await userEvent.type(within(dialog).getByLabelText('子系统名称'), '基础后台');
  await userEvent.clear(within(dialog).getByLabelText('子系统描述'));
  await userEvent.type(within(dialog).getByLabelText('子系统描述'), '组织权限与审计');
  await userEvent.click(within(dialog).getByRole('button', { name: '保存子系统' }));

  expect(onUpdateSubsystem).toHaveBeenCalledWith(
    'admin',
    expect.objectContaining({
      label: { 'zh-CN': '基础后台' },
      desc: { 'zh-CN': '组织权限与审计' },
    }),
  );
});

test('admin 可以从左侧列表新增子系统', async () => {
  const onCreateSubsystem = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onCreateSubsystem });

  await userEvent.click(screen.getByRole('button', { name: '新增子系统' }));
  const dialog = screen.getByRole('dialog', { name: '新增子系统' });
  await userEvent.type(within(dialog).getByLabelText('子系统标识'), 'wms');
  await userEvent.type(within(dialog).getByLabelText('子系统名称'), '仓储执行');
  await userEvent.type(within(dialog).getByLabelText('子系统描述'), '库存 · 波次 · 拣货');
  await userEvent.click(within(dialog).getByRole('button', { name: '保存子系统' }));

  expect(onCreateSubsystem).toHaveBeenCalledWith(
    expect.objectContaining({
      key: 'wms',
      label: { 'zh-CN': '仓储执行' },
      desc: { 'zh-CN': '库存 · 波次 · 拣货' },
      icon: 'layout-grid',
      builtin: false,
      enabled: true,
      sort: 3,
    }),
  );
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

test('菜单树批量折叠按钮根据全局折叠状态自动切换', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  expect(screen.getByRole('button', { name: '折叠' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '展开' })).not.toBeInTheDocument();
  expect(screen.getByText('企业概览')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '折叠' }));

  expect(screen.getByRole('button', { name: '展开' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '折叠' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '展开' }));

  expect(screen.getByRole('button', { name: '折叠' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '展开' })).not.toBeInTheDocument();
  expect(screen.getByText('企业概览')).toBeInTheDocument();
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

  await userEvent.click(getTreeNodeButton('企业概览'));
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

test('菜单表单弹窗底部操作按钮使用表单控件尺寸', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  await userEvent.click(getTreeNodeButton('企业概览'));
  await userEvent.click(screen.getByRole('button', { name: '编辑企业概览' }));
  const dialog = screen.getByRole('dialog', { name: '编辑菜单' });
  const cancelButton = within(dialog).getByRole('button', { name: '取消' });
  const saveButton = within(dialog).getByRole('button', { name: '保存菜单' });

  expect(cancelButton).toHaveAttribute('data-size', 'md');
  expect(cancelButton).toHaveClass('h-[var(--control-md)]');
  expect(saveButton).toHaveAttribute('data-size', 'md');
  expect(saveButton).toHaveClass('h-[var(--control-md)]');
});

test('admin 可以切换菜单显示状态', async () => {
  const onSetMenuVisibility = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onSetMenuVisibility });

  const visibilitySwitch = screen.getByRole('switch', { name: '切换企业概览显示状态' });

  expect(visibilitySwitch).toHaveClass('data-[state=checked]:bg-(--switch-bg-checked)');
  expect(visibilitySwitch.className).not.toContain('bg-success');

  await userEvent.click(visibilitySwitch);

  expect(onSetMenuVisibility).toHaveBeenCalledWith('m-dashboard', false);
});

test('菜单树折叠用动画容器隐藏子节点', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  const childRow = screen.getByText('成员与部门').closest('[data-menu-tree-row]');
  expect(childRow).toBeInTheDocument();
  expect(childRow?.className).toContain('grid-rows-[1fr]');
  expect(childRow?.className).toContain('opacity-100');

  await userEvent.click(screen.getByRole('button', { name: '展开或折叠组织与权限' }));

  expect(childRow?.className).toContain('grid-rows-[0fr]');
  expect(childRow?.className).toContain('opacity-0');
  expect(childRow?.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
});

test('admin 可以删除叶子菜单，非叶子目录不显示删除入口', async () => {
  const onDeleteMenu = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onDeleteMenu });

  await userEvent.click(getTreeNodeButton('组织与权限'));
  expect(screen.queryByRole('button', { name: '删除组织与权限' })).not.toBeInTheDocument();
  await userEvent.click(getTreeNodeButton('企业概览'));
  expect(screen.getByRole('button', { name: '删除企业概览' })).toHaveAttribute('data-variant', 'danger-ghost');
  await userEvent.click(screen.getByRole('button', { name: '删除企业概览' }));
  await userEvent.click(screen.getByRole('button', { name: '确认删除' }));

  expect(onDeleteMenu).toHaveBeenCalledWith('m-dashboard');
});

test('编辑双语菜单只改当前 locale，保留其他语言 label/shortLabel', async () => {
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
  await userEvent.clear(within(dialog).getByLabelText('菜单名称'));
  await userEvent.type(within(dialog).getByLabelText('菜单名称'), '控制台');
  await userEvent.click(within(dialog).getByRole('button', { name: '保存菜单' }));

  // 只改 zh-CN，en-US 保留，短名称两语都不丢
  expect(onUpdateMenu).toHaveBeenCalledWith(
    'm-home',
    expect.objectContaining({
      label: { 'zh-CN': '控制台', 'en-US': 'Workspace' },
      shortLabel: { 'zh-CN': '工作台', 'en-US': 'Workspace' },
    }),
  );
});

test('窄断点下常驻详情栏隐藏，改用抽屉承载编辑/加子级/删除入口', async () => {
  renderMenusView({ permissions: ['*:*:*'] });

  // 常驻 inspector 仅 ≥1536px 显示（hidden + 2xl:flex），窄屏改用抽屉触发按钮（2xl:hidden）
  const aside = screen.getByRole('complementary', { name: '节点详情' });
  expect(aside).toHaveClass('hidden');
  expect(aside).toHaveClass('2xl:flex');
  const trigger = screen.getByRole('button', { name: '节点详情' });
  expect(trigger).toHaveClass('2xl:hidden');

  await userEvent.click(getTreeNodeButton('企业概览'));
  await userEvent.click(trigger);

  const sheet = await screen.findByRole('dialog', { name: '节点详情' });
  expect(within(sheet).getByRole('button', { name: '编辑企业概览' })).toBeInTheDocument();
  expect(within(sheet).getByRole('button', { name: '添加企业概览子节点' })).toBeInTheDocument();
  expect(within(sheet).getByRole('button', { name: '删除企业概览' })).toBeInTheDocument();

  // 从抽屉点击编辑可打开菜单表单，证明窄屏编辑入口真正可达
  await userEvent.click(within(sheet).getByRole('button', { name: '编辑企业概览' }));
  expect(screen.getByRole('dialog', { name: '编辑菜单' })).toBeInTheDocument();
});

test('菜单保存失败时保留弹窗，不抛未处理异常（toast 由全局兜底）', async () => {
  const onUpdateMenu = vi.fn().mockRejectedValue(new Error('boom'));
  renderMenusView({ permissions: ['*:*:*'], onUpdateMenu } as Partial<MenusViewProps>);

  await userEvent.click(getTreeNodeButton('企业概览'));
  await userEvent.click(screen.getByRole('button', { name: '编辑企业概览' }));
  const dialog = screen.getByRole('dialog', { name: '编辑菜单' });
  await userEvent.clear(within(dialog).getByLabelText('菜单名称'));
  await userEvent.type(within(dialog).getByLabelText('菜单名称'), '经营总览');
  await userEvent.click(within(dialog).getByRole('button', { name: '保存菜单' }));

  expect(onUpdateMenu).toHaveBeenCalled();
  // 失败时弹窗不关，等待用户重试
  expect(screen.getByRole('dialog', { name: '编辑菜单' })).toBeInTheDocument();
});

test('菜单表单提交在途时禁用保存按钮，防止重复创建', async () => {
  let release!: () => void;
  const onCreateMenu = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
  renderMenusView({ permissions: ['*:*:*'], onCreateMenu });

  await userEvent.click(screen.getByRole('button', { name: '新增菜单' }));
  await userEvent.type(screen.getByLabelText('菜单名称'), '新目录');
  const saveButton = screen.getByRole('button', { name: '确定新增' });
  await userEvent.click(saveButton);

  // 在途：按钮禁用（loading），只发出一次创建
  expect(saveButton).toBeDisabled();
  expect(onCreateMenu).toHaveBeenCalledTimes(1);

  release();
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '新增菜单' })).not.toBeInTheDocument());
});

test('子系统创建提交在途时禁用保存按钮，防止重复创建', async () => {
  let release!: () => void;
  const onCreateSubsystem = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
  renderMenusView({ permissions: ['*:*:*'], onCreateSubsystem });

  await userEvent.click(screen.getByRole('button', { name: '新增子系统' }));
  const dialog = screen.getByRole('dialog', { name: '新增子系统' });
  await userEvent.type(within(dialog).getByLabelText('子系统标识'), 'wms');
  await userEvent.type(within(dialog).getByLabelText('子系统名称'), '仓储执行');
  await userEvent.type(within(dialog).getByLabelText('子系统描述'), '库存 · 波次 · 拣货');
  const saveButton = within(dialog).getByRole('button', { name: '保存子系统' });
  await userEvent.click(saveButton);

  expect(saveButton).toBeDisabled();
  expect(onCreateSubsystem).toHaveBeenCalledTimes(1);

  release();
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '新增子系统' })).not.toBeInTheDocument());
});
