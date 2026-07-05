import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { ErrorScreen } from '@/components/pro/ErrorScreen';

test('ErrorScreen renders injected copy and home target', async () => {
  const rootRoute = createRootRoute();
  const probeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/probe',
    component: () => (
      <ErrorScreen
        code="404"
        title="页面不存在"
        description="这个地址没有对应页面"
        backHomeLabel="返回首页"
        homeTo="/admin/dashboard"
      />
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([probeRoute]),
    history: createMemoryHistory({ initialEntries: ['/probe'] }),
  });

  render(<RouterProvider router={router} />);

  expect(await screen.findByText('404')).toBeInTheDocument();
  expect(screen.getByText('页面不存在')).toBeInTheDocument();
  expect(screen.getByText('这个地址没有对应页面')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/admin/dashboard');
});

test('ErrorScreen stays presentation-only in pro layer', () => {
  const source = readFileSync('src/components/pro/ErrorScreen.tsx', 'utf8');

  expect(source).not.toContain('useTranslation');
  expect(source).not.toContain('@/config');
  expect(source).not.toContain('appConfig');
});
