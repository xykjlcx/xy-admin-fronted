import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Outlet,
  RouterProvider,
  createRouter,
} from '@tanstack/react-router';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, afterEach, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { Shell } from '@/app/shell/Shell';
import { useAppearance } from '@/stores/appearance';
import { meQuery } from '@/modules/admin/auth/api';
import { menusQuery, subsystemsQuery } from '@/modules/admin/menus/api';
import { manifests } from '@/modules/registry';
import { i18nInit } from '@/lib/i18n';

beforeAll(async () => {
  await i18nInit;
});

afterEach(() => {
  vi.unstubAllGlobals();
  act(() => {
    useAppearance.setState({ layout: 'sidebar', collapsed: {} });
  });
});

test('窄屏强制使用折叠 Sidebar，避免已保存的宽布局挤压业务内容', async () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 1023px)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

  renderShellWithLayout({ layout: 'inset', collapsed: false });

  expect(await screen.findByText('Users content')).toBeInTheDocument();
  expect(document.querySelector('[data-shell-layout="inset"]')).not.toBeInTheDocument();
  expect(document.querySelector('aside')).toHaveClass('w-16');
});

function renderShellWithLayout({
  layout = 'inset',
  collapsed = false,
}: {
  layout?: 'sidebar' | 'rail' | 'inset';
  collapsed?: boolean;
} = {}) {
  act(() => {
    useAppearance.setState({ layout, collapsed: { [layout]: collapsed } });
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const adminManifest = manifests.find((manifest) => manifest.subsystem.key === 'admin')!;
  queryClient.setQueryData(
    subsystemsQuery.queryKey,
    manifests.map((manifest) => manifest.subsystem),
  );
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
    component: () => (
      <PageFrame breadcrumbs={[{ label: '组织与权限' }, { label: '成员与部门' }]}>
        <PageSurface>Users content</PageSurface>
      </PageFrame>
    ),
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

test('Inset 布局把子系统切换和用户入口放回侧栏', async () => {
  const user = userEvent.setup();
  renderShellWithLayout();

  expect(await screen.findByText('Users content')).toBeInTheDocument();
  const shell = document.querySelector('[data-shell-layout="inset"]')!;
  const aside = shell.querySelector('aside')!;
  const main = shell.querySelector('#shell-main') as HTMLElement;
  const surface = shell.querySelector('[data-slot="inset-shell-surface"]') as HTMLElement;
  const header = shell.querySelector('[data-slot="inset-shell-header"]') as HTMLElement;
  const headerStart = header.querySelector('[data-slot="inset-shell-header-start"]') as HTMLElement;
  const headerCenter = header.querySelector('[data-slot="inset-shell-header-center"]') as HTMLElement;
  const headerSuffix = header.querySelector('[data-slot="inset-shell-header-suffix"]') as HTMLElement;
  const brand = aside.querySelector('[data-slot="inset-window-brand"]') as HTMLElement;
  const collapseButton = await within(header).findByRole('button', { name: '收起导航' });
  const sidebarFooter = await screen.findByTestId('inset-sidebar-footer');

  expect(aside).not.toContainElement(collapseButton);
  expect(brand).toHaveClass('desktop-drag-region');
  expect(header).toHaveClass('desktop-drag-region');
  expect(headerSuffix).toHaveClass('inset-window-controls-right');
  expect(aside).toHaveClass('w-[calc(248px*var(--app-scale))]');
  expect(surface).toHaveClass('m-2');
  expect(surface).toHaveClass('ml-1');
  expect(header).toHaveClass('border-b');
  expect(headerStart).toContainElement(collapseButton);
  expect(within(headerStart).queryByRole('button', { name: /后台管理/ })).not.toBeInTheDocument();
  expect(within(headerStart).getByText('组织与权限')).toBeInTheDocument();
  expect(within(headerStart).getByText('成员与部门')).toBeInTheDocument();
  expect(
    within(headerCenter).getByRole('searchbox', { name: '搜索功能导航、组织数据、角色详情等' }),
  ).toBeInTheDocument();
  const sidebarSwitcher = within(aside).getByRole('button', { name: /后台管理/ });
  expect(sidebarSwitcher).toHaveClass('px-2');
  expect(sidebarSwitcher).toHaveClass('py-2');
  const sidebarUser = within(sidebarFooter).getByRole('button', { name: /测试用户/ });
  expect(sidebarFooter).toHaveClass('pb-3');
  expect(sidebarFooter).toHaveClass('border-t');
  expect(sidebarUser).toHaveClass('outline-none');
  expect(sidebarUser).toHaveClass('focus-visible:bg-(--nav-item-bg-hover)');
  expect(sidebarUser).toHaveClass('focus-visible:shadow-none');
  expect(sidebarUser).not.toHaveClass('focus-visible:ring-(--button-ring)');
  expect(sidebarUser).toHaveClass('hover:bg-(--nav-item-bg-hover)');
  expect(sidebarUser).not.toHaveClass('bg-surface/75');
  expect(within(headerSuffix).getByRole('button', { name: '消息通知' })).toBeInTheDocument();
  expect(within(headerSuffix).getByRole('button', { name: '外观设置' })).toBeInTheDocument();
  expect(within(headerSuffix).queryByText('测试用户')).not.toBeInTheDocument();
  expect(main.querySelector('[data-slot="page-breadcrumb"]')).not.toBeInTheDocument();

  await user.click(sidebarUser);
  expect(await screen.findByText('个人中心')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  await waitFor(() => {
    expect(sidebarUser).not.toHaveFocus();
  });
});

test('Inset 折叠侧栏时完整隐藏侧栏顶部和底部内容', async () => {
  renderShellWithLayout({ collapsed: true });

  expect(await screen.findByText('Users content')).toBeInTheDocument();
  const shell = document.querySelector('[data-shell-layout="inset"]')!;
  const aside = shell.querySelector('aside')!;
  const surface = shell.querySelector('[data-slot="inset-shell-surface"]') as HTMLElement;
  const headerSuffix = document.querySelector('[data-slot="inset-shell-header-suffix"]') as HTMLElement;

  expect(aside).toHaveClass('w-0');
  expect(aside).toHaveClass('px-0');
  expect(aside).toHaveClass('overflow-hidden');
  // 折叠的侧栏必须整体退出焦点序与无障碍树（链接仍在 DOM，仅视觉压缩不够）
  expect(aside).toHaveAttribute('inert');
  expect(aside).toHaveAttribute('aria-hidden', 'true');
  expect(surface).toHaveClass('m-2');
  expect(surface).not.toHaveClass('ml-1');
  expect(within(headerSuffix).getByRole('button', { name: '消息通知' })).toBeInTheDocument();
  expect(within(headerSuffix).getByRole('button', { name: '外观设置' })).toBeInTheDocument();
  expect(within(headerSuffix).getByRole('button', { name: '深色模式' })).toBeInTheDocument();
  expect(within(headerSuffix).getByRole('button', { name: '语言 / Language' })).toBeInTheDocument();
  // 折叠后侧栏 footer 的用户菜单不可达，header suffix 必须兜底 icon 入口（登出/个人中心永远可达）
  expect(within(headerSuffix).getByRole('button', { name: /测试用户/ })).toBeInTheDocument();
});

test('Sidebar 布局用子系统切换和页面面包屑替代左上角品牌位', async () => {
  renderShellWithLayout({ layout: 'sidebar' });

  expect(await screen.findByText('Users content')).toBeInTheDocument();
  const header = document.querySelector('header') as HTMLElement;
  const main = document.querySelector('#shell-main') as HTMLElement;

  expect(within(header).queryByText('Ship Any')).not.toBeInTheDocument();
  expect(header).toHaveAttribute('data-window-inset-left', 'true');
  expect(header).toHaveClass('desktop-drag-region');
  expect(within(header).getByRole('button', { name: /后台管理/ })).toBeInTheDocument();
  expect(within(header).getByText('组织与权限')).toBeInTheDocument();
  expect(within(header).getByText('成员与部门')).toBeInTheDocument();
  expect(main.querySelector('[data-slot="page-breadcrumb"]')).not.toBeInTheDocument();
});

test('Rail 布局由左侧窗口区消费 macOS inset，右侧 Header 不重复消费', async () => {
  renderShellWithLayout({ layout: 'rail' });

  expect(await screen.findByText('Users content')).toBeInTheDocument();
  const railWindowRegion = document.querySelector('[data-slot="rail-window-drag-region"]');
  const header = document.querySelector('header');

  expect(railWindowRegion).toBeInTheDocument();
  expect(railWindowRegion).toHaveClass('desktop-drag-region');
  expect(header).toHaveAttribute('data-window-inset-left', 'false');
  expect(header).toHaveClass('desktop-drag-region');
});
