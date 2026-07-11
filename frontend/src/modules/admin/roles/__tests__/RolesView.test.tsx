import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, vi } from 'vitest';
import { i18nInit } from '@/lib/i18n';
import { RolesView, type RolesViewProps } from '@/modules/admin/roles';

beforeAll(async () => {
  await i18nInit;
});

const rolesFixture = [
  { id: 'superadmin', name: '超级管理员', type: 'system', desc: '负责平台全部功能、数据与安全策略管理' },
  { id: 'platform-owner', name: '平台负责人', type: 'system', desc: '负责平台运营配置与跨部门业务协同' },
  { id: 'hr', name: '人事', type: 'system', desc: '负责人力资源相关审批与成员管理', memberDeptId: 'hr' },
  { id: 'ops', name: '运营', type: 'custom', desc: '负责内容与文件资产的日常运营', memberDeptId: 'mkt' },
] satisfies RolesViewProps['roles'];

const permissionTreeFixture = [
  {
    id: 'iam',
    label: '组织与权限',
    resources: [
      {
        id: 'iam:user',
        label: '成员与部门',
        code: 'iam:user',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'create', label: '新建' },
        ],
      },
    ],
  },
  {
    id: 'notice',
    label: '消息中心',
    resources: [
      {
        id: 'notice:msg',
        label: '通知公告',
        code: 'notice:msg',
        actions: [
          { id: 'view', label: '查看' },
          { id: 'publish', label: '发布' },
        ],
      },
    ],
  },
] satisfies RolesViewProps['permissionTree'];

const defaultRolePermissions = {
  'iam:user': ['view'],
  'notice:msg': ['view'],
};

const defaultDataPermission = {
  defaultScope: 'dept' as const,
  defaultDepartmentIds: [],
  resources: {},
};

const departmentsFixture = [
  { id: 'hr', name: '人力资源部' },
  { id: 'fin', name: '财务部' },
  { id: 'rd', name: '产品研发中心' },
];

const membersFixture = [
  { id: 'u-1', name: '郑晓琳', deptLabel: '人力资源部', title: 'HR经理' },
] satisfies RolesViewProps['roleMembers'];

const auditLogsFixture = [
  {
    id: 'audit-1',
    occurredAt: '2026-07-09 15:42',
    operator: '李长昕',
    roleId: 'hr',
    roleName: '人事',
    kind: 'grant' as const,
    change: '新增功能权限：成员与部门 · 新建',
  },
  {
    id: 'audit-2',
    occurredAt: '2026-07-08 11:30',
    operator: '陈雨桐',
    roleId: 'ops',
    roleName: '运营',
    kind: 'remove' as const,
    change: '移除功能权限：成员与部门 · 删除',
  },
] satisfies RolesViewProps['roleAuditLogs'];

function makeHandlers() {
  return {
    onActiveRoleChange: vi.fn(),
    onCreateRole: vi.fn(),
    onDeleteRole: vi.fn(),
    onSaveRolePermissions: vi.fn(),
    onSaveRoleDataPermissions: vi.fn(),
  };
}

function renderRolesView(props: Partial<RolesViewProps> = {}) {
  const handlers = makeHandlers();
  return {
    ...handlers,
    ...render(
      <RolesView
        {...handlers}
        permissions={['iam:role:view']}
        roles={rolesFixture}
        activeRoleId="hr"
        permissionTree={permissionTreeFixture}
        rolePermissions={defaultRolePermissions}
        roleDataPermission={defaultDataPermission}
        departments={departmentsFixture}
        roleMembers={membersFixture}
        roleAuditLogs={auditLogsFixture}
        {...props}
      />,
    ),
  };
}

test('主导航统一为角色管理和操作日志', () => {
  renderRolesView();

  const pageTabs = screen.getAllByRole('tab').slice(0, 2);
  expect(pageTabs.map((tab) => tab.textContent)).toEqual(['角色管理', '操作日志']);
  expect(screen.queryByRole('tab', { name: '管理员权限' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '超级管理员系统角色' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '平台负责人系统角色' })).toBeInTheDocument();
});

test('角色列表行使用即时 hover，避免快速扫过时颜色过渡叠加', () => {
  renderRolesView();

  const roleItem = screen.getByRole('button', { name: '平台负责人系统角色' });

  expect(roleItem).toHaveClass('transition-none');
  expect(roleItem).not.toHaveClass('transition-colors');
});

test('角色详情只保留功能权限、数据权限和角色成员', () => {
  renderRolesView();

  const detailTabs = screen.getAllByRole('tablist')[1]!;
  expect(within(detailTabs).getByRole('tab', { name: '功能权限' })).toBeInTheDocument();
  expect(within(detailTabs).getByRole('tab', { name: '数据权限' })).toBeInTheDocument();
  expect(within(detailTabs).getByRole('tab', { name: '角色成员 · 1' })).toBeInTheDocument();
  expect(within(detailTabs).queryByRole('tab', { name: '操作日志' })).not.toBeInTheDocument();
});

test('角色详情保持无卡片间距的扁平整体布局', () => {
  const { container } = renderRolesView();

  const layout = container.querySelector<HTMLElement>('[data-role-detail-layout]');

  expect(layout).not.toHaveClass('gap-3');
  expect(container.querySelector('[data-role-detail-header]')).not.toBeInTheDocument();
  expect(container.querySelector('[data-role-detail-workspace]')).not.toBeInTheDocument();
  expect(layout?.querySelector('[data-slot="card"]')).not.toBeInTheDocument();
  expect(within(layout!).getByRole('heading', { name: '人事' })).toBeInTheDocument();
  expect(within(layout!).getByText('负责人力资源相关审批与成员管理')).toBeInTheDocument();
  expect(within(layout!).getByRole('tab', { name: '功能权限' })).toBeInTheDocument();
});

test('角色详情右栏复用页面场景密度', () => {
  const { container } = renderRolesView();

  const shell = container.querySelector('[data-role-detail-shell]');
  const layout = container.querySelector<HTMLElement>('[data-role-detail-layout]');

  expect(shell).toHaveClass('px-(--page-scene-px)', 'py-(--page-scene-py)');
  expect(shell).not.toHaveClass('px-7', 'py-[calc(22px*var(--app-scale))]');
  expect(within(layout!).getByRole('heading', { name: '人事' })).toHaveClass('text-base');
  expect(within(layout!).getByText('负责人力资源相关审批与成员管理')).toHaveClass('mb-3');
});

test('viewer 能查看角色配置但看不到写操作', async () => {
  renderRolesView();

  expect(screen.queryByRole('button', { name: '新增角色' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: '数据权限' }));
  expect(screen.getByText('角色默认数据范围')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '保存数据权限' })).not.toBeInTheDocument();
});

test('管理员可以调整角色默认数据范围并保存', async () => {
  const onSaveRoleDataPermissions = vi.fn();
  renderRolesView({ permissions: ['*:*:*'], onSaveRoleDataPermissions });

  await userEvent.click(screen.getByRole('tab', { name: '数据权限' }));
  await userEvent.click(screen.getByRole('combobox', { name: '角色默认数据范围' }));
  await userEvent.click(await screen.findByRole('option', { name: '本部门及下级部门' }));
  await userEvent.click(screen.getByRole('button', { name: '保存数据权限' }));

  expect(onSaveRoleDataPermissions).toHaveBeenCalledWith('hr', {
    ...defaultDataPermission,
    defaultScope: 'deptAndChildren',
  });
});

test('数据权限只编辑角色级范围，不渲染虚假的资源级覆盖', async () => {
  renderRolesView({ permissions: ['*:*:*'] });
  await userEvent.click(screen.getByRole('tab', { name: '数据权限' }));
  expect(screen.getByRole('combobox', { name: '角色默认数据范围' })).toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: '成员与部门数据范围' })).not.toBeInTheDocument();
});

test('操作日志使用表格汇总角色变更并支持关键词筛选', async () => {
  renderRolesView();

  await userEvent.click(screen.getByRole('tab', { name: '操作日志' }));
  expect(screen.getByRole('columnheader', { name: '操作时间' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '操作人' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '角色' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '变更内容' })).toBeInTheDocument();
  expect(screen.getByText('新增功能权限：成员与部门 · 新建')).toBeInTheDocument();

  await userEvent.type(screen.getByRole('searchbox', { name: '搜索操作日志' }), '运营');
  expect(screen.getByText('移除功能权限：成员与部门 · 删除')).toBeInTheDocument();
  expect(screen.queryByText('新增功能权限：成员与部门 · 新建')).not.toBeInTheDocument();
});

test('功能权限仍支持切换动作与保存', async () => {
  const onSaveRolePermissions = vi.fn();
  renderRolesView({ permissions: ['*:*:*'], onSaveRolePermissions });

  await userEvent.click(screen.getByRole('button', { name: '展开消息中心权限分组' }));
  await userEvent.click(screen.getByRole('button', { name: '切换通知公告发布' }));
  await userEvent.click(screen.getByRole('button', { name: '保存' }));
  expect(onSaveRolePermissions).toHaveBeenCalledWith('hr', {
    'iam:user': ['view'],
    'notice:msg': ['view', 'publish'],
  });
});

test('功能权限操作只保留保存，并在全部授权和全部取消间切换', async () => {
  renderRolesView({ permissions: ['*:*:*'] });

  expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '重置' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '全部授权' }));
  expect(screen.getByRole('button', { name: '全部取消' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '全部授权' })).not.toBeInTheDocument();
});

test('功能权限默认只展开第一个分组', () => {
  renderRolesView({ permissions: ['*:*:*'] });

  expect(screen.getByRole('button', { name: '折叠组织与权限权限分组' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  expect(screen.getByRole('button', { name: '展开消息中心权限分组' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  expect(screen.getByRole('button', { name: '切换成员与部门查看' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '切换通知公告查看' })).not.toBeInTheDocument();
});

test('切换角色后恢复为只展开第一个权限分组', async () => {
  const handlers = makeHandlers();
  const { rerender } = render(
    <RolesView
      {...handlers}
      permissions={['*:*:*']}
      roles={rolesFixture}
      activeRoleId="hr"
      permissionTree={permissionTreeFixture}
      rolePermissions={defaultRolePermissions}
      roleDataPermission={defaultDataPermission}
      departments={departmentsFixture}
      roleMembers={membersFixture}
      roleAuditLogs={auditLogsFixture}
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: '展开消息中心权限分组' }));
  expect(screen.getByRole('button', { name: '折叠消息中心权限分组' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );

  rerender(
    <RolesView
      {...handlers}
      permissions={['*:*:*']}
      roles={rolesFixture}
      activeRoleId="ops"
      permissionTree={permissionTreeFixture}
      rolePermissions={defaultRolePermissions}
      roleDataPermission={defaultDataPermission}
      departments={departmentsFixture}
      roleMembers={membersFixture}
      roleAuditLogs={auditLogsFixture}
    />,
  );

  expect(screen.getByRole('button', { name: '折叠组织与权限权限分组' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  expect(screen.getByRole('button', { name: '展开消息中心权限分组' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );

  rerender(
    <RolesView
      {...handlers}
      permissions={['*:*:*']}
      roles={rolesFixture}
      activeRoleId="hr"
      permissionTree={permissionTreeFixture}
      rolePermissions={defaultRolePermissions}
      roleDataPermission={defaultDataPermission}
      departments={departmentsFixture}
      roleMembers={membersFixture}
      roleAuditLogs={auditLogsFixture}
    />,
  );

  expect(screen.getByRole('button', { name: '折叠组织与权限权限分组' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  expect(screen.getByRole('button', { name: '展开消息中心权限分组' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('功能权限分组无外围边框但保留内部单线并连续排列', () => {
  const { container } = renderRolesView({ permissions: ['*:*:*'] });

  const permissionGroups = container.querySelector('[data-role-permission-groups]');
  const groups = container.querySelectorAll('[data-role-permission-group]');

  expect(permissionGroups).toHaveClass('overflow-hidden', 'rounded-12');
  expect(permissionGroups).not.toHaveClass('border', 'border-(--table-row-border)');
  expect(permissionGroups).not.toHaveClass('gap-3');
  expect(groups).toHaveLength(2);
  expect(groups[0]).toHaveClass('first:border-t-0');
  expect(groups[1]).toHaveClass('border-t', 'border-(--table-row-border)');
});

test('功能权限树复用表格行高并收紧资源动作', () => {
  renderRolesView({ permissions: ['*:*:*'] });

  const groupToggle = screen.getByRole('button', { name: '折叠组织与权限权限分组' });
  const action = screen.getByRole('button', { name: '切换成员与部门新建' });
  const resourceRow = action.parentElement?.parentElement;

  expect(groupToggle.parentElement).toHaveClass('h-(--table-row-h)');
  expect(action).toHaveAttribute('data-size', 'xs');
  expect(resourceRow).toHaveClass('items-center', 'gap-3', 'py-1.5');
});

test('数据权限与角色成员也使用紧凑详情密度', async () => {
  const { container } = renderRolesView({ permissions: ['*:*:*'] });

  await userEvent.click(screen.getByRole('tab', { name: '数据权限' }));
  const dataPermissionEditor = container.querySelector('[data-role-data-permission-editor]');
  expect(dataPermissionEditor?.firstElementChild).toHaveClass('mb-4');
  expect(screen.getByRole('button', { name: '保存数据权限' })).toHaveAttribute('data-size', 'sm');

  await userEvent.click(screen.getByRole('tab', { name: '角色成员 · 1' }));
  const memberCard = screen.getByText('郑晓琳').parentElement?.parentElement;
  expect(memberCard).toHaveClass('gap-2.5', 'px-3', 'py-2.5');
});

test('角色成员保持原有展示', async () => {
  renderRolesView();

  await userEvent.click(screen.getByRole('tab', { name: '角色成员 · 1' }));
  expect(screen.getByText('郑晓琳')).toBeInTheDocument();
  expect(screen.getByText('人力资源部 · HR经理')).toBeInTheDocument();
});

test('admin 可以新增和删除自定义角色', async () => {
  const onCreateRole = vi.fn();
  const onDeleteRole = vi.fn();
  renderRolesView({
    permissions: ['*:*:*'],
    activeRoleId: 'ops',
    onCreateRole,
    onDeleteRole,
  });

  await userEvent.click(screen.getByRole('button', { name: '新增角色' }));
  await userEvent.type(screen.getByPlaceholderText('如：运营、客服'), '客服');
  await userEvent.click(screen.getByRole('button', { name: '确定创建' }));
  expect(onCreateRole).toHaveBeenCalledWith({ name: '客服', desc: '' });

  await userEvent.click(screen.getByRole('button', { name: '删除角色' }));
  await userEvent.click(screen.getByRole('button', { name: '确认删除' }));
  expect(onDeleteRole).toHaveBeenCalledWith('ops');
});

test('角色详情加载时只在详情区显示 skeleton', () => {
  renderRolesView({ roleDetailLoading: true, roleMembers: [] });

  expect(screen.getByRole('button', { name: '超级管理员系统角色' })).toBeInTheDocument();
  expect(screen.getByRole('status', { name: '正在更新' })).toBeInTheDocument();
  expect(screen.getAllByTestId('role-detail-loading-row')).toHaveLength(4);
});

test('业务角色创建提交在途时禁用确定按钮', async () => {
  let release!: () => void;
  const onCreateRole = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  renderRolesView({ permissions: ['*:*:*'], onCreateRole });

  await userEvent.click(screen.getByRole('button', { name: '新增角色' }));
  await userEvent.type(screen.getByPlaceholderText('如：运营、客服'), '客服');
  const confirmButton = screen.getByRole('button', { name: '确定创建' });
  await userEvent.click(confirmButton);

  expect(confirmButton).toBeDisabled();
  expect(onCreateRole).toHaveBeenCalledTimes(1);

  release();
  await waitFor(() => expect(screen.queryByRole('button', { name: '确定创建' })).not.toBeInTheDocument());
});

test('角色详情是唯一纵向滚动容器，标签内容不再内部滚动', async () => {
  const { container } = renderRolesView({ permissions: ['*:*:*'] });

  expect(container.querySelector('[data-role-page-frame]')).toHaveClass('overflow-hidden');
  expect(container.querySelector('[data-role-workspace]')).toHaveClass('overflow-hidden');
  expect(container.querySelector('[data-role-detail-shell]')).toHaveClass(
    'overflow-y-auto',
    'overscroll-contain',
  );
  expect(container.querySelector('[data-role-detail-shell]')).not.toHaveClass('overflow-hidden');
  expect(container.querySelector('[data-role-permission-panel-scroll]')).not.toHaveClass(
    'overflow-y-auto',
    'flex-1',
  );

  await userEvent.click(screen.getByRole('tab', { name: '数据权限' }));
  expect(container.querySelector('[data-role-data-permission-editor]')).not.toHaveClass('min-h-0', 'flex-1');
  expect(container.querySelector('[data-role-data-permission-content]')).not.toHaveClass(
    'overflow-y-auto',
    'flex-1',
  );

  await userEvent.click(screen.getByRole('tab', { name: '角色成员 · 1' }));
  expect(container.querySelector('[data-role-tab-content-scroll]')).not.toHaveClass(
    'overflow-y-auto',
    'flex-1',
  );
});

test('角色列表和详情之间只由详情区绘制一条分隔线', () => {
  const { container } = renderRolesView({ permissions: ['*:*:*'] });

  expect(container.querySelector('[data-role-list-panel]')).not.toHaveClass('border-r');
  expect(container.querySelector('[data-role-detail-shell]')).toHaveClass('border-l');
});

test('操作日志表格没有可写操作', async () => {
  renderRolesView({ permissions: ['*:*:*'] });
  await userEvent.click(screen.getByRole('tab', { name: '操作日志' }));

  const table = screen.getByRole('table');
  expect(within(table).queryByRole('button')).not.toBeInTheDocument();
});
