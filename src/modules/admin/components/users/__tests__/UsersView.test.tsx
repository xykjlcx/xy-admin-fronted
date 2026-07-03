import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, vi } from 'vitest';
import { UsersView, type UsersViewProps } from '@/modules/admin/components/users/UsersView';
import type { UsersQueryParams } from '@/modules/admin/api/user.api';
import { i18nInit } from '@/lib/i18n';

beforeAll(async () => {
  await i18nInit;
});

const deptFixtures = [{ id: 'rd', parentId: null, name: '产品研发中心', sort: 1 }];
const deptTreeFixtures = [
  { id: 'rd', parentId: null, name: '产品研发中心', sort: 1 },
  { id: 'rd_fe', parentId: 'rd', name: '前端组', sort: 2 },
  { id: 'rd_be', parentId: 'rd', name: '后端组', sort: 3 },
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
  expect(await screen.findByText('成员与部门')).toBeInTheDocument();
  expect(screen.getByText('李长昕')).toBeInTheDocument();
});

test('状态筛选和分页回调给路由层写 URL 的 next search', async () => {
  const onSearchChange = vi.fn();
  renderUsersView({ permissions: ['*:*:*'], onSearchChange });

  await userEvent.click(screen.getByRole('button', { name: /账号状态/ }));
  await userEvent.click(screen.getByRole('button', { name: '停用' }));
  expect(onSearchChange).toHaveBeenCalledWith({ status: 'disabled', page: 1 });

  await userEvent.click(screen.getByRole('button', { name: '›' }));
  expect(onSearchChange).toHaveBeenCalledWith({ page: 2 });
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

  expect(screen.getByRole('button', { name: '已离职成员' })).toHaveClass('border-pri');
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

  await userEvent.click(screen.getByRole('button', { name: '›' }));

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
