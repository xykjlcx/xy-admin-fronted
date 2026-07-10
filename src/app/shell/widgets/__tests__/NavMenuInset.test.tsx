import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeAll } from 'vitest';
import { NavMenuInset } from '@/app/shell/widgets/NavMenuInset';
import { i18nInit } from '@/lib/i18n';
import type { MenuNode } from '@/lib/menu-tree';
import type { Subsystem } from '@/modules/types';

beforeAll(async () => {
  await i18nInit;
});

const subsystems = [
  {
    key: 'admin',
    label: { 'zh-CN': '后台管理' },
    desc: { 'zh-CN': '组织 · 权限 · 审计' },
    icon: 'layout-grid',
    color: 'var(--accent-emphasis)',
    home: '/admin/dashboard',
    builtin: true,
    enabled: true,
    sort: 1,
  },
] satisfies Subsystem[];

const tree = [
  {
    id: 'm-home',
    parentId: null,
    subsystemKey: 'admin',
    type: 'dir',
    label: { 'zh-CN': '工作台' },
    icon: 'layout-dashboard',
    visible: true,
    sort: 1,
    children: [
      {
        id: 'm-dashboard',
        parentId: 'm-home',
        subsystemKey: 'admin',
        type: 'menu',
        label: { 'zh-CN': '企业概览' },
        path: '/admin/dashboard',
        permission: 'dashboard:view',
        visible: true,
        sort: 1,
      },
      {
        id: 'm-roles',
        parentId: 'm-home',
        subsystemKey: 'admin',
        type: 'menu',
        label: { 'zh-CN': '角色与权限' },
        path: '/admin/roles',
        permission: 'iam:role:view',
        visible: true,
        sort: 2,
      },
    ],
  },
] satisfies MenuNode[];

function renderInsetNav(footer?: React.ReactNode, collapsed = false) {
  const rootRoute = createRootRoute({
    component: () => (
      <NavMenuInset
        tree={tree}
        subsystems={subsystems}
        collapsed={collapsed}
        footer={footer}
      />
    ),
  });
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/dashboard',
    component: () => null,
  });
  const rolesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/roles',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([dashboardRoute, rolesRoute]),
    history: createMemoryHistory({ initialEntries: ['/admin/dashboard'] }),
  });

  return render(<RouterProvider router={router} />);
}

test('Inset 侧栏不渲染折叠按钮，折叠入口由主内容区承载', async () => {
  renderInsetNav();

  expect(await screen.findByRole('link', { name: '企业概览' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '收起导航' })).not.toBeInTheDocument();
  expect(screen.queryByText('收起导航')).not.toBeInTheDocument();
});

test('Inset 侧栏不内置全局搜索入口', async () => {
  renderInsetNav();

  expect(await screen.findByRole('link', { name: '企业概览' })).toBeInTheDocument();
  expect(screen.queryByRole('searchbox', { name: '搜索功能导航、组织数据、角色详情等' })).not.toBeInTheDocument();
});

test('Inset 侧栏只有 active 菜单项有边框和阴影', async () => {
  renderInsetNav();

  const active = await screen.findByRole('link', { name: '企业概览' });
  const inactive = screen.getByRole('link', { name: '角色与权限' });

  expect(active).toHaveClass('border');
  expect(active).toHaveClass('border-(--nav-item-border-current)');
  expect(active).toHaveClass('shadow-(--nav-item-shadow-current)');
  expect(inactive).not.toHaveClass('border');
  expect(inactive).not.toHaveClass('border-transparent');
  expect(inactive).not.toHaveClass('shadow-(--nav-item-shadow-current)');
});

test('折叠态整个侧栏 inert + aria-hidden，链接不进焦点序与无障碍树', async () => {
  renderInsetNav(undefined, true);

  // 折叠态没有可见链接可等待，等 aside 本体挂载完成
  await waitFor(() => expect(document.querySelector('aside')).not.toBeNull());
  const aside = document.querySelector('aside');
  // 折叠只是 w-0 视觉压缩，链接仍在 DOM——必须靠 inert 掐掉键盘焦点与读屏可达性
  expect(aside).toHaveAttribute('inert');
  expect(aside).toHaveAttribute('aria-hidden', 'true');
  expect(screen.queryByRole('link', { name: '企业概览' })).not.toBeInTheDocument();
});

test('展开态侧栏无 inert，链接正常可达', async () => {
  renderInsetNav();

  expect(await screen.findByRole('link', { name: '企业概览' })).toBeInTheDocument();
  const aside = document.querySelector('aside');
  expect(aside).not.toHaveAttribute('inert');
  expect(aside).not.toHaveAttribute('aria-hidden');
});

test('Inset 侧栏支持底部壳层动作槽位', async () => {
  renderInsetNav(<button type="button">侧栏动作</button>);

  const footer = await screen.findByTestId('inset-sidebar-footer');
  expect(footer).toHaveClass('mt-3');
  expect(footer).toHaveClass('shrink-0');
  expect(footer).toHaveTextContent('侧栏动作');
  expect(document.querySelector('aside')).toContainElement(footer);
});
