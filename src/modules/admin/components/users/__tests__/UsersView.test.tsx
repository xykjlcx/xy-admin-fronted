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

function renderUsersView(props: Partial<UsersViewProps> = {}) {
  const baseHandlers = {
    onSearchChange: vi.fn(),
    onCreateUser: vi.fn(),
    onUpdateUser: vi.fn(),
    onDeleteUser: vi.fn(),
    onBatchDisable: vi.fn(),
  };

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
