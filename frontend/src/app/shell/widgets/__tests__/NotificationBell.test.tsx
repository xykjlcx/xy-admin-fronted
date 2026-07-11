import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@/components/ui/tooltip';
import { NotificationBell } from '@/app/shell/widgets/NotificationBell';
import { messagesQuery } from '@/modules/admin/messages/api';
import { i18nInit } from '@/lib/i18n';

beforeAll(async () => { await i18nInit; });

test('消息铃铛展示真实未读数并导航消息中心', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(messagesQuery('all').queryKey, {
    list: [],
    unreadCount: 3,
  });
  const rootRoute = createRootRoute({ component: Outlet });
  const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/home', component: NotificationBell });
  const messagesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin/messages',
    component: () => <div>消息中心页面</div>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, messagesRoute]),
    history: createMemoryHistory({ initialEntries: ['/home'] }),
    context: { queryClient },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  );

  const trigger = await screen.findByRole('button', { name: '消息通知' });
  expect(trigger).toHaveTextContent('3');
  await userEvent.click(trigger);
  expect(await screen.findByText('消息中心页面')).toBeInTheDocument();
});
