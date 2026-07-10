import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { LogsPage } from '@/modules/admin/logs';
import { logHandlers } from '@/modules/admin/logs/mocks';
import { i18nInit } from '@/lib/i18n';

const server = setupServer(...logHandlers);
beforeAll(async () => {
  await i18nInit;
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage(permissions = ['*:*:*']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <LogsPage permissions={permissions} />
    </QueryClientProvider>,
  );
}

test('默认展示操作日志并可搜索与按类型筛选', async () => {
  renderPage();

  expect(await screen.findByText('角色「财务」权限调整')).toBeInTheDocument();
  const search = screen.getByRole('searchbox', { name: '搜索日志' });
  await userEvent.type(search, '品牌手册');
  expect(await screen.findByText('上传「品牌手册V3.pdf」')).toBeInTheDocument();
  expect(screen.queryByText('角色「财务」权限调整')).not.toBeInTheDocument();

  await userEvent.clear(search);
  await userEvent.click(screen.getByRole('button', { name: /操作类型/ }));
  await userEvent.click(screen.getByRole('menuitemradio', { name: '删除' }));
  const table = await screen.findByRole('table');
  expect(within(table).getAllByText('删除').length).toBeGreaterThan(0);
  expect(within(table).queryByText('新增')).not.toBeInTheDocument();
});

test('可切换到登录日志并筛选失败记录', async () => {
  renderPage();
  await screen.findByText('角色「财务」权限调整');

  await userEvent.click(screen.getByRole('tab', { name: '登录日志' }));
  expect((await screen.findAllByText('Chrome · macOS')).length).toBeGreaterThan(0);
  await userEvent.click(screen.getByRole('button', { name: /登录结果/ }));
  await userEvent.click(screen.getByRole('menuitemradio', { name: '失败' }));

  expect(await screen.findByText('Firefox · Linux')).toBeInTheDocument();
  expect(screen.queryByText('飞书客户端 · Windows')).not.toBeInTheDocument();
});

test('只有导出权限时才展示导出日志操作', async () => {
  renderPage(['audit:oplog:view']);
  await screen.findByText('角色「财务」权限调整');
  expect(screen.queryByRole('button', { name: '导出日志' })).not.toBeInTheDocument();
});

test('日期区间参与日志查询并更新结果数', async () => {
  renderPage();
  await screen.findByText('角色「财务」权限调整');

  fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2026-06-30' } });
  fireEvent.change(screen.getByLabelText('结束日期'), { target: { value: '2026-06-30' } });

  await waitFor(() => expect(screen.getByText('共 3 条记录')).toBeInTheDocument());
  expect(screen.queryByText('修改企业名称')).not.toBeInTheDocument();
});
