import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  RouterProvider,
  createRouter,
} from '@tanstack/react-router';
import { act, render, screen, within } from '@testing-library/react';
import { beforeAll, afterEach } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Shell } from '@/app/shell/Shell';
import { useAppearance } from '@/stores/appearance';
import { meQuery } from '@/modules/admin/api/auth.api';
import { menusQuery, subsystemsQuery } from '@/modules/admin/api/menu.api';
import { manifests } from '@/modules/registry';
import { i18nInit } from '@/lib/i18n';

beforeAll(async () => {
  await i18nInit;
});

afterEach(() => {
  act(() => {
    useAppearance.setState({ layout: 'sidebar', collapsed: {} });
  });
});

function renderShellWithInsetLayout() {
  act(() => {
    useAppearance.setState({ layout: 'inset', collapsed: { inset: false } });
  });

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
  const usersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/users',
    component: () => <div>Users content</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([usersRoute]),
    history: createMemoryHistory({ initialEntries: ['/admin/users'] }),
    context: { queryClient },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

test('Inset 布局把全局动作和用户入口放在侧栏底部', async () => {
  renderShellWithInsetLayout();

  expect(await screen.findByText('Users content')).toBeInTheDocument();
  const shell = document.querySelector('[data-shell-layout="inset"]')!;
  const aside = shell.querySelector('aside')!;
  const main = shell.querySelector('#shell-main')!;
  const footer = await screen.findByTestId('inset-sidebar-footer');

  expect(aside).toContainElement(footer);
  expect(main.parentElement).not.toContainElement(footer);
  expect(within(footer).getByRole('button', { name: '消息通知' })).toBeInTheDocument();
  expect(within(footer).getByRole('button', { name: '外观设置' })).toBeInTheDocument();
  expect(within(footer).getByText('测试用户')).toBeInTheDocument();
});
