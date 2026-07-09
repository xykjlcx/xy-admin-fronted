import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
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
    ],
  },
] satisfies MenuNode[];

function renderInsetNav() {
  const rootRoute = createRootRoute({
    component: () => (
      <NavMenuInset
        tree={tree}
        subsystems={subsystems}
        collapsed={false}
      />
    ),
  });
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/dashboard',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([dashboardRoute]),
    history: createMemoryHistory({ initialEntries: ['/admin/dashboard'] }),
  });

  return render(<RouterProvider router={router} />);
}

test('Inset 侧栏不渲染底部收起导航入口', async () => {
  renderInsetNav();

  expect(await screen.findByRole('link', { name: '企业概览' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '收起导航' })).not.toBeInTheDocument();
  expect(screen.queryByText('收起导航')).not.toBeInTheDocument();
});
