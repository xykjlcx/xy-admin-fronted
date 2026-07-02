import { createRouter, createMemoryHistory } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from '@/routeTree.gen';
import { meQuery } from '@/modules/admin/api/auth.api';
import { useAuth } from '@/stores/auth';

// 直接驱动路由 beforeLoad 守卫（无需浏览器）：预置 me 缓存绕过网络，断言重定向落点。
function buildRouter(opts: { token: string | null; permissions?: string[] }, initial: string) {
  const queryClient = new QueryClient();
  if (opts.permissions)
    queryClient.setQueryData(meQuery.queryKey, {
      user: { id: 'u', name: 'n', username: 'u' },
      roles: [],
      permissions: opts.permissions,
    });
  useAuth.setState({ token: opts.token });
  return createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initial] }),
  });
}

afterEach(() => {
  useAuth.setState({ token: null });
});

test('未登录访问受保护路由 → 重定向 /login', async () => {
  const router = buildRouter({ token: null }, '/admin/dashboard');
  await router.load();
  expect(router.state.location.pathname).toBe('/login');
});

test('已登录但缺页面权限 → 重定向 /403', async () => {
  const router = buildRouter({ token: 't', permissions: [] }, '/admin/dashboard');
  await router.load();
  expect(router.state.location.pathname).toBe('/403');
});

test('已登录且有页面权限 → 停留目标路由', async () => {
  const router = buildRouter({ token: 't', permissions: ['dashboard:view'] }, '/admin/dashboard');
  await router.load();
  expect(router.state.location.pathname).toBe('/admin/dashboard');
});
