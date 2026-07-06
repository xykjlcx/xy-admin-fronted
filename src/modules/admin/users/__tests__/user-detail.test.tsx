import { existsSync, readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  expect(await screen.findByText('李长昕')).toBeInTheDocument();
  const detailButton = screen.getAllByRole('button', { name: '详情' })[0];
  if (!detailButton) throw new Error('detail button missing');
  await userEvent.click(detailButton);

  const dialog = await screen.findByRole('dialog', { name: '李长昕' });
  expect(dialog).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '基础信息' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '权限' })).toBeInTheDocument();
  expect(within(dialog).getByText('超级管理员')).toBeInTheDocument();
  expect(within(dialog).getByText('+86 158 0611 9676')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: '权限' }));
  expect(screen.getByText('权限数据源待定')).toBeInTheDocument();
});
