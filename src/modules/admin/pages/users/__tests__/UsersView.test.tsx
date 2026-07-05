import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, vi } from 'vitest';
import { UsersView, type UsersViewProps } from '@/modules/admin/pages/users';
import type { UsersQueryParams } from '@/modules/admin/api/user.api';
import { i18nInit } from '@/lib/i18n';

beforeAll(async () => {
  await i18nInit;
});

const deptFixtures = [{ id: 'rd', parentId: null, name: '产品研发中心', sort: 1, memberCount: 6 }];
const deptTreeFixtures = [
  { id: 'rd', parentId: null, name: '产品研发中心', sort: 1, memberCount: 6 },
  { id: 'rd_fe', parentId: 'rd', name: '前端组', sort: 2, memberCount: 2 },
  { id: 'rd_be', parentId: 'rd', name: '后端组', sort: 3, memberCount: 2 },
];
const userPageFixture = {
  list: [
    {
      id: 'u-1',
      name: '李长昕',
      deptId: 'rd',
      role: '超级管理员',
      phone: '+86 158 0611 9676',
      email: 'w@example.com',
      status: 'active',
      joinedAt: '2026-07-01',
    },
  ],
  total: 11,
} satisfies UsersViewProps['usersPage'];
const defaultSearch = { page: 1, pageSize: 10, status: 'all', keyword: '' } satisfies UsersQueryParams;

function makeHandlers() {
  return {
    onSearchChange: vi.fn(),
    onCreateUser: vi.fn(),
    onUpdateUser: vi.fn(),
    onDeleteUser: vi.fn(),
    onBatchDisable: vi.fn(),
  };
}

function renderUsersView(props: Partial<UsersViewProps> = {}) {
  const baseHandlers = makeHandlers();

  return {
    ...baseHandlers,
    ...render(
      <UsersView
        {...baseHandlers}
        permissions={['iam:user:view']}
        depts={deptFixtures}
        usersPage={userPageFixture}
        search={defaultSearch}
        {...props}
      />,
    ),
  };
}

test('viewer 看不到添加成员按钮但能看列表', async () => {
  renderUsersView();

  expect(screen.queryByRole('button', { name: '添加成员' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '邀请成员' })).not.toBeInTheDocument();
  expect(await screen.findByText('成员与部门')).toBeInTheDocument();
  expect(screen.getByText('李长昕')).toBeInTheDocument();
});

test('状态筛选和分页回调给路由层写 URL 的 next search', async () => {
  const onSearchChange = vi.fn();
  renderUsersView({ permissions: ['*:*:*'], onSearchChange });

  await userEvent.click(screen.getByRole('button', { name: /账号状态/ }));
  await userEvent.click(screen.getByRole('menuitemradio', { name: '停用' }));
  expect(onSearchChange).toHaveBeenCalledWith({ status: 'disabled', page: 1 });

  await userEvent.click(screen.getByRole('button', { name: '下一页' }));
  expect(onSearchChange).toHaveBeenCalledWith({ page: 2 });
});

test('直属成员筛选写入 URL 状态，不在按钮里做本地假过滤', async () => {
  const onSearchChange = vi.fn();
  renderUsersView({
    permissions: ['*:*:*'],
    search: { ...defaultSearch, deptId: 'rd' },
    onSearchChange,
  });

  await userEvent.click(screen.getByRole('button', { name: '仅展示部门直属成员' }));

  expect(onSearchChange).toHaveBeenCalledWith({ directOnly: true, page: 1 });
});

test('成员筛选控件使用统一灰底样式，激活后切换为白底', () => {
  const { rerender } = renderUsersView({
    permissions: ['*:*:*'],
    search: { ...defaultSearch, deptId: 'rd' },
  });

  const statusFilter = screen.getByRole('button', { name: /账号状态/ });
  const directOnlyFilter = screen.getByRole('button', { name: '仅展示部门直属成员' });

  expect(statusFilter).toHaveAttribute('data-role-filter-control', 'select');
  expect(directOnlyFilter).toHaveAttribute('data-role-filter-control', 'toggle');
  for (const control of [statusFilter, directOnlyFilter]) {
    expect(control).toHaveClass('border-(--field-border)');
    expect(control).toHaveClass('bg-(--field-bg)');
    expect(control).toHaveClass('hover:border-(--field-border-hover)');
    expect(control).toHaveClass('hover:bg-(--field-bg)');
    expect(control).toHaveClass('data-[state=open]:bg-(--field-bg-focus)');
  }
  expect(directOnlyFilter).toHaveAttribute('data-state', 'closed');

  rerender(
    <UsersView
      permissions={['*:*:*']}
      depts={deptFixtures}
      usersPage={userPageFixture}
      search={{ ...defaultSearch, deptId: 'rd', directOnly: true }}
      onSearchChange={vi.fn()}
      onCreateUser={vi.fn()}
      onUpdateUser={vi.fn()}
      onDeleteUser={vi.fn()}
      onBatchDisable={vi.fn()}
    />,
  );

  expect(screen.getByRole('button', { name: '仅展示部门直属成员' })).toHaveAttribute('data-state', 'open');
});

test('admin 可以编辑成员并提交更新回调', async () => {
  const onUpdateUser = vi.fn();
  renderUsersView({ permissions: ['*:*:*'], onUpdateUser });

  await userEvent.click(screen.getByRole('button', { name: '编辑' }));
  await userEvent.clear(screen.getByPlaceholderText('角色'));
  await userEvent.type(screen.getByPlaceholderText('角色'), '运营负责人');
  await userEvent.click(screen.getByRole('button', { name: '保存' }));

  expect(onUpdateUser).toHaveBeenCalledWith(
    'u-1',
    expect.objectContaining({ role: '运营负责人', name: '李长昕' }),
  );
});

test('外部 URL 状态切到已离职时同步 tab 并隐藏成员筛选工具栏', () => {
  const handlers = makeHandlers();
  const { rerender } = render(
    <UsersView
      {...handlers}
      permissions={['*:*:*']}
      depts={deptFixtures}
      usersPage={userPageFixture}
      search={defaultSearch}
    />,
  );

  rerender(
    <UsersView
      {...handlers}
      permissions={['*:*:*']}
      depts={deptFixtures}
      usersPage={userPageFixture}
      search={{ ...defaultSearch, status: 'left' }}
    />,
  );

  expect(screen.getByRole('tab', { name: '已离职成员' })).toHaveClass('ui-tabs-line-trigger');
  expect(screen.getByRole('tab', { name: '已离职成员' })).not.toHaveClass('text-(--tabs-line-trigger-fg-active)');
  expect(screen.queryByRole('button', { name: /账号状态/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '添加成员' })).not.toBeInTheDocument();
});

test('切换到不同列表数据时清空已选行，避免批量操作作用到不可见成员', async () => {
  const handlers = makeHandlers();
  const { rerender } = render(
    <UsersView
      {...handlers}
      permissions={['*:*:*']}
      depts={deptFixtures}
      usersPage={userPageFixture}
      search={defaultSearch}
    />,
  );

  await userEvent.click(screen.getByLabelText('选择李长昕'));
  expect(screen.getByText('已选 1 人')).toBeInTheDocument();

  rerender(
    <UsersView
      {...handlers}
      permissions={['*:*:*']}
      depts={deptFixtures}
      usersPage={{
        list: [{ ...userPageFixture.list[0]!, id: 'u-2', name: '王思远' }],
        total: 1,
      }}
      search={{ ...defaultSearch, page: 2 }}
    />,
  );

  expect(screen.queryByText('已选 1 人')).not.toBeInTheDocument();
});

test('触发分页等 URL 变更时立即清空已选行，不等待新数据返回', async () => {
  const onSearchChange = vi.fn();
  renderUsersView({ permissions: ['*:*:*'], onSearchChange });

  await userEvent.click(screen.getByLabelText('选择李长昕'));
  expect(screen.getByText('已选 1 人')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '下一页' }));

  expect(onSearchChange).toHaveBeenCalledWith({ page: 2 });
  expect(screen.queryByText('已选 1 人')).not.toBeInTheDocument();
});

test('部门搜索框过滤部门树但保留全部成员入口', async () => {
  renderUsersView({ depts: deptTreeFixtures });

  await userEvent.type(screen.getByPlaceholderText('搜索部门'), '后端');

  expect(screen.getAllByText('全部成员').length).toBeGreaterThan(0);
  expect(screen.getByText('后端组')).toBeInTheDocument();
  expect(screen.queryByText('前端组')).not.toBeInTheDocument();
});

test('部门树成员数来自部门数据，不受当前列表筛选 total 误导', () => {
  renderUsersView({
    depts: deptTreeFixtures,
    search: { ...defaultSearch, deptId: 'rd_fe' },
    usersPage: { ...userPageFixture, total: 2 },
  });

  expect(screen.getByRole('button', { name: '全部成员 6' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '产品研发中心 6' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '前端组 2' })).toBeInTheDocument();
});

test('成员表选择框使用自定义表格 checkbox 样式', () => {
  renderUsersView({ permissions: ['*:*:*'] });

  expect(screen.getByLabelText('选择本页成员')).toHaveClass('appearance-none');
  expect(screen.getByLabelText('选择李长昕')).toHaveClass('appearance-none');
});

test('成员数据加载时只在表格区域显示 skeleton，页面外壳和部门树保持可见', () => {
  renderUsersView({ usersPage: { list: [], total: 0 }, usersLoading: true });

  expect(screen.getByText('成员与部门')).toBeInTheDocument();
  expect(screen.getAllByText('全部成员').length).toBeGreaterThan(0);
  expect(screen.getByRole('status', { name: '正在加载成员' })).toBeInTheDocument();
  expect(screen.getAllByTestId('table-loading-row')).toHaveLength(6);
  expect(screen.queryByText('暂无成员')).not.toBeInTheDocument();
});

test('成员数据刷新时保留旧表格并显示表格级更新状态', () => {
  renderUsersView({ usersRefreshing: true });

  expect(screen.getByText('李长昕')).toBeInTheDocument();
  expect(screen.getByText('正在更新')).toBeInTheDocument();
});

test('UsersPage uses centralized user mutations so department counts invalidate with writes', () => {
  const source = readFileSync('src/modules/admin/pages/users/index.tsx', 'utf8');
  const usersPageSource = source.slice(source.indexOf('export function UsersPage'), source.indexOf('export function UsersView'));

  expect(usersPageSource).toContain('useUserMutations');
  expect(usersPageSource).not.toContain('useQueryClient');
  expect(usersPageSource).not.toContain('useMutation');
  expect(usersPageSource).not.toContain('userApi');
});
