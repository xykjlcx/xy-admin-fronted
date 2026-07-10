import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { UsersPage } from '@/modules/admin/users';
import { usersModuleHandlers } from '@/modules/admin/users/mocks';
import type { UsersSearch } from '@/modules/admin/users/types';
import { i18nInit } from '@/lib/i18n';
import { resetDb } from '@/mocks/db';

const server = setupServer(...usersModuleHandlers);

beforeAll(async () => {
  await i18nInit;
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());

function renderUsersPage(search: UsersSearch) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSearchChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <UsersPage permissions={['*:*:*']} search={search} onSearchChange={onSearchChange} />
    </QueryClientProvider>,
  );
  return { onSearchChange };
}

test('out-of-range page corrects to the last available page after data loads', async () => {
  // 全部成员总数 14，pageSize 10 → 末页为第 2 页；直接访问第 5 页应回正
  const { onSearchChange } = renderUsersPage({ page: 5, pageSize: 10, status: 'all', keyword: '' });

  await waitFor(() => expect(onSearchChange).toHaveBeenCalledWith({ page: 2 }));
});

test('a valid last page is left untouched', async () => {
  const { onSearchChange } = renderUsersPage({ page: 2, pageSize: 10, status: 'all', keyword: '' });

  // 第 2 页（末页）的成员之一，出现即代表数据已加载、page-correction effect 已跑过
  await screen.findByText('董雨桐');
  expect(onSearchChange).not.toHaveBeenCalled();
});
