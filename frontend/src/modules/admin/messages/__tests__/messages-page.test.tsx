import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { MessagesPage } from '@/modules/admin/messages';
import { messageHandlers } from '@/modules/admin/messages/mocks';
import { i18nInit } from '@/lib/i18n';
import { resetDb } from '@/mocks/db';

const server = setupServer(...messageHandlers);
beforeAll(async () => {
  await i18nInit;
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MessagesPage permissions={['*:*:*']} />
    </QueryClientProvider>,
  );
}

test('消息中心展示列表详情并在打开消息后标记已读', async () => {
  renderPage();

  expect(await screen.findByRole('button', { name: /新成员加入申请/ })).toBeInTheDocument();
  expect(screen.getByText(/高天翔申请加入/)).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '未读 3' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /角色权限变更待审核/ }));
  expect(await screen.findByText(/管理员修改了「财务」角色/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('tab', { name: '未读 2' })).toBeInTheDocument());
});

test('未读筛选和全部已读形成可回读闭环', async () => {
  renderPage();
  await screen.findByRole('button', { name: /新成员加入申请/ });

  await userEvent.click(screen.getByRole('tab', { name: /未读/ }));
  expect(screen.getByRole('button', { name: /存储空间预警/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /系统维护通知/ })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '全部已读' }));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: /新成员加入申请/ })).not.toBeInTheDocument(),
  );
  expect(screen.getByText('暂无消息')).toBeInTheDocument();
});

test('审批消息支持同意并展示已处理状态', async () => {
  renderPage();
  await screen.findByText(/高天翔申请加入/);

  await userEvent.click(screen.getByRole('button', { name: '同意' }));

  expect(await screen.findByText('已同意')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '拒绝' })).not.toBeInTheDocument();
});

test('消息中心声明窄屏上下主从结构，避免详情被挤成逐字竖排', async () => {
  renderPage();
  const item = await screen.findByRole('button', { name: /新成员加入申请/ });
  const list = item.closest('aside');

  expect(list).toHaveClass('w-full', 'lg:w-[calc(380px*var(--app-scale))]');
  expect(list?.parentElement).toHaveClass('flex-col', 'lg:flex-row');
});
