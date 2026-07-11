import { existsSync, readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { beforeAll } from 'vitest';
import { UsersPage } from '@/modules/admin/users';
import { usersModuleHandlers } from '@/modules/admin/users/mocks';
import type { UsersSearch } from '@/modules/admin/users/types';
import { i18nInit } from '@/lib/i18n';
import { resetDb } from '@/mocks/db';

const server = setupServer(...usersModuleHandlers);
const defaultSearch: UsersSearch = { page: 1, pageSize: 10, status: 'all', keyword: '' };

beforeAll(async () => {
  await i18nInit;
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());

function renderUsersPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <UsersPage permissions={['*:*:*']} search={defaultSearch} onSearchChange={() => undefined} />
    </QueryClientProvider>,
  );
}

test('detail page owns full detail query by id without enabled branching', () => {
  expect(existsSync('src/modules/admin/users/detail/UserDetailPage.tsx')).toBe(true);
  const source = readFileSync('src/modules/admin/users/detail/UserDetailPage.tsx', 'utf8');

  expect(source).toContain('userDetailQuery(userId)');
  expect(source).not.toContain('enabled');
});

test('clicking member detail opens independently queried profile and permission tabs', async () => {
  renderUsersPage();

  const memberLink = await screen.findByRole('button', { name: '李长昕' });
  expect(screen.queryByRole('button', { name: '详情' })).not.toBeInTheDocument();
  await userEvent.click(memberLink);

  const dialog = await screen.findByRole('dialog', { name: '李长昕' });
  expect(dialog).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '基础信息' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '权限' })).toBeInTheDocument();
  expect(within(dialog).getByText('超级管理员')).toBeInTheDocument();
  expect(within(dialog).getByText('+86 158 0611 9676')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: '权限' }));
  expect(screen.getByText('权限数据源待定')).toBeInTheDocument();
});

test('detail request failure shows an error message and retry recovers the profile', async () => {
  // 首次详情请求失败，重试时落到默认 handler 成功
  server.use(
    http.get('/api/users/:id', () => new HttpResponse(null, { status: 500 }), { once: true }),
  );
  renderUsersPage();

  const memberLink = await screen.findByRole('button', { name: '李长昕' });
  await userEvent.click(memberLink);

  const alert = await screen.findByRole('alert');
  expect(within(alert).getByText('加载成员详情失败')).toBeInTheDocument();

  await userEvent.click(within(alert).getByRole('button', { name: '重试' }));

  const dialog = await screen.findByRole('dialog', { name: '李长昕' });
  expect(within(dialog).getByText('超级管理员')).toBeInTheDocument();
});
