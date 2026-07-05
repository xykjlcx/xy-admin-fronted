import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { beforeAll, vi } from 'vitest';
import { usersModuleHandlers } from '@/modules/admin/users/mocks';
import { UsersPage } from '@/modules/admin/users';
import { i18nInit } from '@/lib/i18n';
import { resetDb } from '@/mocks/db';
import type { UsersSearch } from '@/modules/admin/users/types';

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

const defaultSearch: UsersSearch = { page: 1, pageSize: 10, status: 'all', keyword: '' };

function renderUsersPage(search: UsersSearch = defaultSearch) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSearchChange = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <UsersPage permissions={['*:*:*']} search={search} onSearchChange={onSearchChange} />
    </QueryClientProvider>,
  );

  return { onSearchChange };
}

test('users index is a UI skeleton without query or mutation hooks', () => {
  const source = readFileSync('src/modules/admin/users/index.tsx', 'utf8');

  expect(source).toContain('useState');
  expect(source).toContain('MembersScene');
  expect(source).toContain('DeptScene');
  expect(source).not.toMatch(/use(Query|SuspenseQuery|Mutation|QueryClient)\b/);
});

test('users page mounts members scene and department scene from vertical list components', async () => {
  renderUsersPage();

  expect(await screen.findByText('成员与部门')).toBeInTheDocument();
  expect(await screen.findByText('李长昕')).toBeInTheDocument();
  expect(screen.getByRole('tree', { name: '部门' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('tab', { name: '部门' }));
  await waitFor(() => expect(screen.getByText('组织架构')).toBeInTheDocument());
  expect(screen.getByRole('tree', { name: '部门' })).toBeInTheDocument();
  expect(screen.getByRole('treeitem', { name: '全部成员 14' })).toBeInTheDocument();
  expect(screen.getAllByText('产品研发中心').length).toBeGreaterThanOrEqual(2);
});

test('members table selection reset scope includes pagination before new data arrives', () => {
  const source = readFileSync('src/modules/admin/users/list/MembersTable.tsx', 'utf8');
  const resetSelectionKeyBlock = source.slice(
    source.indexOf('const resetSelectionKey = ['),
    source.indexOf('].join', source.indexOf('const resetSelectionKey = [')),
  );

  expect(resetSelectionKeyBlock).toContain('effectiveSearch.page');
  expect(resetSelectionKeyBlock).toContain('effectiveSearch.pageSize');
});

test('department tree count keeps baseline numeric meta without member suffix', async () => {
  renderUsersPage();

  expect(await screen.findByRole('treeitem', { name: '全部成员 14' })).toBeInTheDocument();
  expect(screen.getByRole('treeitem', { name: '产品研发中心 6' })).toBeInTheDocument();
  expect(screen.queryByRole('treeitem', { name: '全部成员 14 人' })).not.toBeInTheDocument();
});

test('department scene uses department-specific empty and loading labels', () => {
  const source = readFileSync('src/modules/admin/users/list/DeptScene.tsx', 'utf8');
  const zh = readFileSync('src/locales/zh-CN/admin.json', 'utf8');
  const en = readFileSync('src/locales/en-US/admin.json', 'utf8');

  expect(source).toContain("t('users.deptList.empty')");
  expect(source).toContain("t('users.deptList.loading')");
  expect(zh).toContain('"empty": "暂无部门"');
  expect(zh).toContain('"loading": "正在加载部门"');
  expect(en).toContain('"empty": "No departments"');
  expect(en).toContain('"loading": "Loading departments"');
});
