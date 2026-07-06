import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
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

interface ColumnMetaProbeRow {
  id: string;
}

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

test('members scene owns controlled row selection and clears it with search changes', () => {
  const sceneSource = readFileSync('src/modules/admin/users/list/MembersScene.tsx', 'utf8');
  const tableSource = readFileSync('src/modules/admin/users/list/MembersTable.tsx', 'utf8');

  expect(sceneSource).toContain('useState<RowSelectionState>({})');
  expect(sceneSource).toContain('handleRowSelectionChange');
  expect(sceneSource).toContain(
    'setRowSelection((current) => (typeof updater === \'function\' ? updater(current) : updater))',
  );
  expect(sceneSource).toContain('clearRowSelection()');
  expect(sceneSource).toContain('onSearchChange(patch)');
  expect(sceneSource).toContain('rowSelection={rowSelection}');
  expect(sceneSource).toContain('onRowSelectionChange={handleRowSelectionChange}');
  expect(sceneSource).not.toContain('resetSelectionKey');

  expect(tableSource).toContain('rowSelection: RowSelectionState');
  expect(tableSource).toContain('onRowSelectionChange: OnChangeFn<RowSelectionState>');
  expect(tableSource).toContain('userColumnsV2');
  expect(tableSource).toContain('onClearSelection');
  expect(tableSource).not.toContain('resetSelectionKey');
  expect(tableSource).not.toContain('bulkResetVersion');
  expect(tableSource).not.toContain('currentPageIds');
});

test('member columns expose TanStack ColumnDef without legacy DataTable column API', () => {
  const source = readFileSync('src/modules/admin/users/list/columns.tsx', 'utf8');

  expect(source).toContain("import type { ColumnDef } from '@tanstack/react-table'");
  expect(source).toContain('export function userColumnsV2');
  expect(source).toContain('): ColumnDef<UserDto>[]');
  expect(source).not.toContain('DataTableColumn');
  expect(source).not.toContain('export function userColumns({');
  expect(source).toContain('row.original');
  expect(source).toContain('row.index');
  expect(source.match(/enableSorting: false/g)).toHaveLength(5);
  expect(source).toContain("meta: { width: '24%' }");
  expect(source).toContain("meta: { width: '17%' }");
  expect(source).toContain("meta: { width: 'calc(120px * var(--app-scale))', align: 'end' }");
  expect(source).not.toContain('getSortedRowModel');
  expect(source).not.toContain('getFilteredRowModel');
  expect(source).not.toContain('size:');
});

test('TanStack ColumnMeta exposes table layout metadata without type assertions', () => {
  const column: ColumnDef<ColumnMetaProbeRow> = {
    id: 'probe',
    meta: { width: '24%', align: 'end' },
  };

  const width: string | undefined = column.meta?.width;
  const align: 'start' | 'center' | 'end' | undefined = column.meta?.align;

  expect(width).toBe('24%');
  expect(align).toBe('end');
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
