import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  Link,
  Outlet,
  RouterProvider,
  createRouter,
  useLocation,
} from '@tanstack/react-router';
import { PageTransition } from '@/components/pro/PageTransition';
import { useAppearance } from '@/stores/appearance';

test('路由切换时保留内容区 transition 容器，只替换 route 内容', async () => {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        <nav>
          <Link to="/admin/dashboard">A</Link>
          <Link to="/admin/users" search={{ page: 1, pageSize: 10, status: 'all', keyword: '' }}>
            B
          </Link>
        </nav>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </>
    ),
  });
  const routeA = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/dashboard',
    component: () => <div>A content</div>,
  });
  const routeB = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/users',
    component: () => <div>B content</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([routeA, routeB]),
    history: createMemoryHistory({ initialEntries: ['/admin/dashboard'] }),
  });

  render(<RouterProvider router={router} />);

  const firstFrame = (await screen.findByText('A content')).parentElement;
  expect(firstFrame).toBeTruthy();
  firstFrame?.setAttribute('data-stability-probe', 'stable');

  await userEvent.click(screen.getByRole('link', { name: 'B' }));

  expect(screen.getByText('B content').parentElement).toHaveAttribute('data-stability-probe', 'stable');
});

test('路由切换时在稳定 transition 容器上重放页面动画', async () => {
  useAppearance.setState({ pageAnim: 'fade' });

  const rootRoute = createRootRoute({
    component: () => (
      <>
        <nav>
          <Link to="/admin/dashboard">A</Link>
          <Link to="/admin/users" search={{ page: 1, pageSize: 10, status: 'all', keyword: '' }}>
            B
          </Link>
        </nav>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </>
    ),
  });
  const routeA = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/dashboard',
    component: () => <div>A content</div>,
  });
  const routeB = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/users',
    component: () => <div>B content</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([routeA, routeB]),
    history: createMemoryHistory({ initialEntries: ['/admin/dashboard'] }),
  });

  render(<RouterProvider router={router} />);

  const firstFrame = (await screen.findByText('A content')).parentElement;
  expect(firstFrame).toBeTruthy();
  firstFrame?.setAttribute('data-stability-probe', 'stable');
  firstFrame?.style.setProperty('animation', 'none');

  await userEvent.click(screen.getByRole('link', { name: 'B' }));

  const nextFrame = screen.getByText('B content').parentElement;
  expect(nextFrame).toHaveAttribute('data-stability-probe', 'stable');
  expect(nextFrame?.style.animation).toContain('pg-fade');
});

test('仅 search 变化时不重放页面级 transition 动画', async () => {
  useAppearance.setState({ pageAnim: 'fade' });

  function SearchContent() {
    const location = useLocation();
    return <div>Current search: {location.searchStr}</div>;
  }

  const rootRoute = createRootRoute({
    component: () => (
      <>
        <nav>
          <Link
            to="/admin/users"
            search={{ page: 2, pageSize: 10, status: 'all', keyword: '' }}
          >
            Next page
          </Link>
        </nav>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </>
    ),
  });
  const usersRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/users',
    component: SearchContent,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([usersRoute]),
    history: createMemoryHistory({
      initialEntries: ['/admin/users?page=1&pageSize=10&status=all&keyword='],
    }),
  });

  render(<RouterProvider router={router} />);

  const firstFrame = (await screen.findByText(/page=1/)).parentElement;
  expect(firstFrame).toBeTruthy();
  firstFrame?.setAttribute('data-stability-probe', 'stable');
  firstFrame?.style.setProperty('animation', 'none');

  await userEvent.click(screen.getByRole('link', { name: 'Next page' }));

  const nextFrame = screen.getByText(/page=2/).parentElement;
  expect(nextFrame).toHaveAttribute('data-stability-probe', 'stable');
  expect(nextFrame?.style.animation).toBe('none');
});
