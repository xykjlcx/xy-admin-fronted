import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { DictionariesPage } from '@/modules/admin/dictionaries';
import { dictionaryHandlers } from '@/modules/admin/dictionaries/mocks';
import { i18nInit } from '@/lib/i18n';
import { resetDb } from '@/mocks/db';

const server = setupServer(...dictionaryHandlers);

beforeAll(async () => {
  await i18nInit;
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());

function renderPage(permissions = ['*:*:*']) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <DictionariesPage permissions={permissions} />
    </QueryClientProvider>,
  );
}

test('字典页展示目录与当前字典项并支持切换目录', async () => {
  renderPage();

  expect(await screen.findByRole('button', { name: /用户状态/ })).toBeInTheDocument();
  expect(await screen.findByText('在职')).toBeInTheDocument();
  expect(screen.getByText('已离职')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /性别/ }));
  expect(await screen.findByText('男')).toBeInTheDocument();
  expect(screen.getByText('保密')).toBeInTheDocument();
  expect(screen.queryByText('在职')).not.toBeInTheDocument();
});

test('字典项可新增并即时启停', async () => {
  renderPage();
  await screen.findByText('在职');

  await userEvent.click(screen.getByRole('button', { name: '新增字典项' }));
  await userEvent.type(screen.getByRole('textbox', { name: '字典标签' }), '已锁定');
  await userEvent.type(screen.getByRole('textbox', { name: '字典值' }), 'locked');
  await userEvent.click(screen.getByRole('button', { name: '保存字典项' }));

  const valueCell = await screen.findByText('locked');
  const row = valueCell.closest('tr');
  if (!row) throw new Error('dictionary item row missing');
  expect(within(row).getByText('已锁定')).toBeInTheDocument();

  await userEvent.click(within(row).getByRole('switch', { name: '已锁定 状态' }));
  expect(await within(row).findByText('停用')).toBeInTheDocument();
});

test('只读权限隐藏字典写操作并禁用字典项开关', async () => {
  renderPage(['sys:dict:view']);
  await screen.findByText('在职');

  expect(screen.queryByRole('button', { name: '新增字典' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新增字典项' })).not.toBeInTheDocument();
  expect(screen.getByRole('switch', { name: '在职 状态' })).toBeDisabled();
});

test('字典页可新增自定义字典并立即选中', async () => {
  renderPage();
  await screen.findByRole('button', { name: /用户状态/ });

  await userEvent.click(screen.getByRole('button', { name: '新增字典' }));
  await userEvent.type(screen.getByRole('textbox', { name: '字典名称' }), '运单状态');
  await userEvent.type(screen.getByRole('textbox', { name: '字典编码' }), 'shipment_status');
  await userEvent.type(screen.getByRole('textbox', { name: '用途说明' }), '尾程运单生命周期');
  await userEvent.click(screen.getByRole('button', { name: '创建字典' }));

  expect(await screen.findByRole('button', { name: /运单状态/ })).toBeInTheDocument();
  expect(screen.getByText('shipment_status')).toBeInTheDocument();
  expect(screen.getByText('暂无字典项')).toBeInTheDocument();
});
