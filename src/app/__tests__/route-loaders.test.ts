import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory, createRouter } from '@tanstack/react-router';
import { setupServer } from 'msw/node';
import { queryClient as appQueryClient } from '@/app/query';
import { routeTree } from '@/routeTree.gen';
import { dashboardOverviewQuery } from '@/modules/admin/api/dashboard.api';
import { meQuery } from '@/modules/admin/api/auth.api';
import { menusQuery, subsystemsQuery } from '@/modules/admin/api/menu.api';
import {
  adminRolesQuery,
  permissionTreeQuery,
  roleLogsQuery,
  roleMembersQuery,
  rolePermissionsQuery,
  rolesQuery,
} from '@/modules/admin/api/role.api';
import { deptsQuery, usersQuery } from '@/modules/admin/api/user.api';
import { dashboardHandlers } from '@/modules/admin/mocks/dashboard.handlers';
import { menuHandlers } from '@/modules/admin/mocks/menu.handlers';
import { roleHandlers } from '@/modules/admin/mocks/role.handlers';
import { userHandlers } from '@/modules/admin/mocks/user.handlers';
import { useAuth } from '@/stores/auth';

const server = setupServer(
  ...dashboardHandlers,
  ...menuHandlers,
  ...roleHandlers,
  ...userHandlers,
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  appQueryClient.clear();
  useAuth.setState({ token: null });
});
afterAll(() => server.close());

function buildRouter(initial: string, permissions: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  queryClient.setQueryData(meQuery.queryKey, {
    user: { id: 'u-test', name: '测试用户', username: 'test' },
    roles: [],
    permissions,
  });
  useAuth.setState({ token: 'token' });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initial] }),
  });

  return { router, queryClient };
}

test('dashboard 已配置首屏预取，冷缓存进入时概览数据进 cache', async () => {
  const { router, queryClient } = buildRouter('/admin/dashboard', ['dashboard:view']);

  await router.load();

  expect(queryClient.getQueryData(dashboardOverviewQuery.queryKey)).toBeTruthy();
});

test('users 已配置首屏预取，冷缓存进入时部门和当前列表进 cache', async () => {
  const search = { page: 1, pageSize: 10, status: 'all' as const, keyword: '' };
  const { router, queryClient } = buildRouter('/admin/users?page=1&pageSize=10&status=all&keyword=', [
    'iam:user:view',
  ]);

  await router.load();

  expect(queryClient.getQueryData(subsystemsQuery.queryKey)).toBeTruthy();
  expect(queryClient.getQueryData(menusQuery('admin').queryKey)).toBeTruthy();
  expect(queryClient.getQueryData(deptsQuery.queryKey)).toBeTruthy();
  expect(queryClient.getQueryData(usersQuery(search).queryKey)).toMatchObject({ total: 14 });
});

test('roles 已配置首屏预取，冷缓存进入时角色列表和默认详情进 cache', async () => {
  const { router, queryClient } = buildRouter('/admin/roles?roleId=', ['iam:role:view']);

  await router.load();

  expect(queryClient.getQueryData(rolesQuery.queryKey)).toBeTruthy();
  expect(queryClient.getQueryData(permissionTreeQuery.queryKey)).toBeTruthy();
  expect(queryClient.getQueryData(adminRolesQuery.queryKey)).toBeTruthy();
  expect(queryClient.getQueryData(rolePermissionsQuery('hr').queryKey)).toBeTruthy();
  expect(queryClient.getQueryData(roleMembersQuery('hr').queryKey)).toBeTruthy();
  expect(queryClient.getQueryData(roleLogsQuery('hr').queryKey)).toBeTruthy();
  expect(queryClient.getQueryData(usersQuery({ page: 1, pageSize: 50, status: 'all', keyword: '' }).queryKey)).toBeTruthy();
});
