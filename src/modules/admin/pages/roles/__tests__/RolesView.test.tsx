import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, vi } from 'vitest';
import { i18nInit } from '@/lib/i18n';
import { RolesView, type RolesViewProps } from '@/modules/admin/pages/roles';

beforeAll(async () => {
  await i18nInit;
});

const rolesFixture = [
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
        code: 'notice:notice',
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

const membersFixture = [
  { id: 'u-1', name: '郑晓琳', deptLabel: '人力资源部', title: 'HR经理' },
] satisfies RolesViewProps['roleMembers'];

const logsFixture = [
  { id: 'l-1', kind: 'grant', who: '李长昕', text: '授予 郑晓琳 此角色', time: '2 小时前' },
] satisfies RolesViewProps['roleLogs'];

const adminRolesFixture = [
  { id: 'ar-1', name: '超级管理员', type: 'system', admin: '李长昕', scope: '全部权限' },
] satisfies RolesViewProps['adminRoles'];

const selectableMembersFixture = [
  { id: 'u-1', name: '李长昕' },
  { id: 'u-2', name: '王思远' },
] satisfies RolesViewProps['selectableMembers'];

function makeHandlers() {
  return {
    onActiveRoleChange: vi.fn(),
    onCreateRole: vi.fn(),
    onDeleteRole: vi.fn(),
    onSaveRolePermissions: vi.fn(),
    onCreateAdminRole: vi.fn(),
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
        roleMembers={membersFixture}
        roleLogs={logsFixture}
        adminRoles={adminRolesFixture}
        selectableMembers={selectableMembersFixture}
        {...props}
      />,
    ),
  };
}

test('viewer 能看角色详情但看不到写操作入口', () => {
  renderRolesView();

  expect(screen.getByText('角色与权限')).toBeInTheDocument();
  expect(screen.getAllByText('人事').length).toBeGreaterThan(0);
  expect(screen.getByText('负责人力资源相关审批与成员管理')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新增角色' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '保存权限' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '删除角色' })).not.toBeInTheDocument();
});

test('业务角色页固定页面高度，只让右侧详情区滚动', () => {
  const { container } = renderRolesView({ permissions: ['*:*:*'] });

  const frame = container.querySelector('[data-role-page-frame]');
  const surface = container.querySelector('[data-role-page-surface]');
  const workspace = container.querySelector('[data-role-workspace]');
  const detailScroll = container.querySelector('[data-role-detail-scroll]');

  expect(frame).toBeInTheDocument();
  expect(frame).toHaveClass('h-[calc(100vh-3.5rem)]');
  expect(frame).toHaveClass('overflow-hidden');
  expect(surface).toBeInTheDocument();
  expect(surface).toHaveClass('min-h-0');
  expect(surface).toHaveClass('flex-1');
  expect(workspace).toBeInTheDocument();
  expect(workspace).toHaveClass('overflow-hidden');
  expect(detailScroll).toBeInTheDocument();
  expect(detailScroll).toHaveClass('min-h-0');
  expect(detailScroll).toHaveClass('overflow-y-auto');
});

test('admin 可以新增业务角色', async () => {
  const onCreateRole = vi.fn();
  renderRolesView({ permissions: ['*:*:*'], onCreateRole });

  await userEvent.click(screen.getByRole('button', { name: '新增角色' }));
  await userEvent.type(screen.getByPlaceholderText('如：运营、客服'), '客服');
  await userEvent.type(screen.getByPlaceholderText('选填，描述该角色的职责'), '负责客服流程');
  await userEvent.click(screen.getByRole('button', { name: '确定创建' }));

  expect(onCreateRole).toHaveBeenCalledWith({ name: '客服', desc: '负责客服流程' });
});

test('自定义角色可以删除，系统角色不显示删除入口', async () => {
  const onDeleteRole = vi.fn();
  const { rerender } = renderRolesView({
    permissions: ['*:*:*'],
    activeRoleId: 'hr',
    onDeleteRole,
  });

  expect(screen.queryByRole('button', { name: '删除角色' })).not.toBeInTheDocument();

  rerender(
    <RolesView
      permissions={['*:*:*']}
      roles={rolesFixture}
      activeRoleId="ops"
      permissionTree={permissionTreeFixture}
      rolePermissions={defaultRolePermissions}
      roleMembers={membersFixture}
      roleLogs={logsFixture}
      adminRoles={adminRolesFixture}
      selectableMembers={selectableMembersFixture}
      onActiveRoleChange={vi.fn()}
      onCreateRole={vi.fn()}
      onDeleteRole={onDeleteRole}
      onSaveRolePermissions={vi.fn()}
      onCreateAdminRole={vi.fn()}
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: '删除角色' }));
  await userEvent.click(screen.getByRole('button', { name: '确认删除' }));
  expect(onDeleteRole).toHaveBeenCalledWith('ops');
});

test('权限树支持动作切换、全部授权、清空、重置与保存', async () => {
  const onSaveRolePermissions = vi.fn();
  renderRolesView({ permissions: ['*:*:*'], onSaveRolePermissions });

  await userEvent.click(screen.getByRole('button', { name: '切换通知公告发布' }));
  await userEvent.click(screen.getByRole('button', { name: '保存权限' }));
  expect(onSaveRolePermissions).toHaveBeenLastCalledWith('hr', {
    'iam:user': ['view'],
    'notice:msg': ['view', 'publish'],
  });

  await userEvent.click(screen.getByRole('button', { name: '清空' }));
  await userEvent.click(screen.getByRole('button', { name: '保存权限' }));
  expect(onSaveRolePermissions).toHaveBeenLastCalledWith('hr', {});

  await userEvent.click(screen.getByRole('button', { name: '全部授权' }));
  await userEvent.click(screen.getByRole('button', { name: '保存权限' }));
  expect(onSaveRolePermissions).toHaveBeenLastCalledWith('hr', {
    'iam:user': ['view', 'create'],
    'notice:msg': ['view', 'publish'],
  });

  await userEvent.click(screen.getByRole('button', { name: '重置' }));
  await userEvent.click(screen.getByRole('button', { name: '保存权限' }));
  expect(onSaveRolePermissions).toHaveBeenLastCalledWith('hr', defaultRolePermissions);
});

test('权限分组折叠用动画容器隐藏内容', async () => {
  renderRolesView({ permissions: ['*:*:*'] });

  const panel = document.querySelector('[data-permission-group-panel]');
  expect(panel).toBeInTheDocument();
  expect(panel?.className).toContain('grid-rows-[1fr]');
  expect(panel?.className).toContain('opacity-100');
  expect(screen.getByRole('button', { name: '切换成员与部门查看' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '折叠组织与权限权限分组' }));

  expect(panel?.className).toContain('grid-rows-[0fr]');
  expect(panel?.className).toContain('opacity-0');
  expect(panel).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('button', { name: '切换成员与部门查看' })).not.toBeInTheDocument();
});

test('角色成员和操作日志 tab 展示对应数据', async () => {
  renderRolesView();

  await userEvent.click(screen.getByRole('tab', { name: '角色成员 · 1' }));
  expect(screen.getByText('郑晓琳')).toBeInTheDocument();
  expect(screen.getByText('人力资源部 · HR经理')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: '操作日志' }));
  expect(screen.getByText('授予 郑晓琳 此角色')).toBeInTheDocument();
});

test('角色详情加载时只在详情区显示 skeleton，角色列表保持可见', () => {
  renderRolesView({
    roleDetailLoading: true,
    rolePermissions: {},
    roleMembers: [],
    roleLogs: [],
  } as Partial<RolesViewProps>);

  expect(screen.getByText('角色与权限')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '人事系统角色' })).toBeInTheDocument();
  expect(screen.getByRole('status', { name: '正在更新' })).toBeInTheDocument();
  expect(screen.getAllByTestId('role-detail-loading-row')).toHaveLength(4);
  expect(screen.queryByText('暂无匹配权限')).not.toBeInTheDocument();
});

test('管理员权限 tab 可以新增管理员角色', async () => {
  const onCreateAdminRole = vi.fn();
  renderRolesView({ permissions: ['*:*:*'], onCreateAdminRole });

  await userEvent.click(screen.getByRole('tab', { name: '管理员权限' }));
  await userEvent.click(screen.getByRole('button', { name: '创建管理员角色' }));
  await userEvent.type(screen.getByPlaceholderText('如：文件管理员'), '客服管理员');
  await userEvent.click(screen.getByRole('combobox', { name: '指派管理员' }));
  await userEvent.click(await screen.findByRole('option', { name: '王思远' }));
  await userEvent.click(screen.getByRole('button', { name: '确定创建' }));

  expect(onCreateAdminRole).toHaveBeenCalledWith({ name: '客服管理员', admin: '王思远' });
});
