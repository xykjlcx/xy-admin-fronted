import { render, screen } from '@testing-library/react';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { RouteError } from '@/app/RouteError';
import { ContractError } from '@/lib/http/errors';
import { i18nInit } from '@/lib/i18n';

// 验证 F2：配了 defaultErrorComponent 后，路由 match 用 CatchBoundary 兜住渲染期抛错，
// 显示恢复 UI（500 + 重试 + 返回首页）而非整树卸载白屏。

beforeAll(async () => {
  await i18nInit;
});

function renderWithError(error: Error) {
  const rootRoute = createRootRoute();
  const probeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/probe',
    component: () => {
      throw error;
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([probeRoute]),
    history: createMemoryHistory({ initialEntries: ['/probe'] }),
    defaultErrorComponent: RouteError,
  });
  render(<RouterProvider router={router} />);
}

test('RouteError catches a render-time throw and shows recovery UI (no white screen)', async () => {
  renderWithError(new Error('boom'));

  expect(await screen.findByText('500')).toBeInTheDocument();
  expect(screen.getByText('页面出错了')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '返回首页' })).toBeInTheDocument();
});

test('RouteError maps ContractError to its specific copy', async () => {
  renderWithError(new ContractError('contract failed', []));

  expect(await screen.findByText('数据格式异常，请联系管理员')).toBeInTheDocument();
});
