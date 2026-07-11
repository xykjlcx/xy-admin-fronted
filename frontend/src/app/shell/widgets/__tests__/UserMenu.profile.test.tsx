import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { meQuery } from '@/modules/admin/auth/api';
import { UserMenu } from '@/app/shell/widgets/UserMenu';
import { i18nInit } from '@/lib/i18n';
import { TooltipProvider } from '@/components/ui/tooltip';

beforeAll(async () => { await i18nInit; });

test('用户菜单的资料、账号和语言入口导航到个人中心对应分区', async () => {
  const client = new QueryClient();
  client.setQueryData(meQuery.queryKey, { user: { id: 'u1', name: '李长昕', username: 'leah@acme.com' }, roles: ['superadmin'], permissions: ['*:*:*'] });
  const root = createRootRoute({ component: Outlet });
  const home = createRoute({ getParentRoute: () => root, path: '/home', component: () => <UserMenu /> });
  const profile = createRoute({ getParentRoute: () => root, path: '/admin/profile', component: () => <div>profile</div>, validateSearch: (search: Record<string, unknown>) => search });
  const routeTree = root.addChildren([home, profile]);
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/home'] }), context: { queryClient: client } });
  await router.load();
  render(<QueryClientProvider client={client}><TooltipProvider><RouterProvider router={router} /></TooltipProvider></QueryClientProvider>);

  await userEvent.click(screen.getByText('李长昕'));
  await userEvent.click(await screen.findByRole('menuitem', { name: '个人中心' }));
  expect(router.state.location.pathname).toBe('/admin/profile');
  expect(router.state.location.search).toMatchObject({ tab: 'info' });
});
