import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  RouterProvider,
  createRouter,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Shell } from '@/app/shell/Shell';
import { meQuery } from '@/modules/admin/api/auth.api';
import { menusQuery, subsystemsQuery } from '@/modules/admin/api/menu.api';
import { manifests } from '@/modules/registry';
import { i18nInit } from '@/lib/i18n';

beforeAll(async () => {
  await i18nInit;
});

test('Shell 层在菜单路由切换时保持同一组 Header、Sidebar 和内容容器节点', async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const adminManifest = manifests.find((manifest) => manifest.subsystem.key === 'admin')!;
  queryClient.setQueryData(subsystemsQuery.queryKey, manifests.map((manifest) => manifest.subsystem));
  queryClient.setQueryData(menusQuery('admin').queryKey, adminManifest.menuSeed);
  queryClient.setQueryData(meQuery.queryKey, {
    user: { id: 'u-test', name: '测试用户', username: 'test' },
    roles: ['superadmin'],
    permissions: ['*:*:*'],
  });

  const rootRoute = createRootRoute({
    component: () => (
      <Shell>
        <Outlet />
      </Shell>
    ),
  });
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/dashboard',
    component: () => <div>Dashboard content</div>,
  });
  const usersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/users',
    component: () => <div>Users content</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([dashboardRoute, usersRoute]),
    history: createMemoryHistory({ initialEntries: ['/admin/dashboard'] }),
    context: { queryClient },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  );

  expect(await screen.findByText('Dashboard content')).toBeInTheDocument();
  const header = document.querySelector('header');
  const aside = document.querySelector('aside');
  const sidebarNav = document.querySelector('aside nav');
  const main = document.querySelector('#shell-main');
  const transitionFrame = main?.firstElementChild;

  expect(header).toBeTruthy();
  expect(aside).toBeTruthy();
  expect(sidebarNav).toBeTruthy();
  expect(main).toBeTruthy();
  expect(transitionFrame).toBeTruthy();

  await userEvent.click(screen.getByRole('link', { name: '成员与部门' }));

  expect(await screen.findByText('Users content')).toBeInTheDocument();
  expect(document.querySelector('header')).toBe(header);
  expect(document.querySelector('aside')).toBe(aside);
  expect(document.querySelector('aside nav')).toBe(sidebarNav);
  expect(document.querySelector('#shell-main')).toBe(main);
  expect(document.querySelector('#shell-main')?.firstElementChild).toBe(transitionFrame);
});
