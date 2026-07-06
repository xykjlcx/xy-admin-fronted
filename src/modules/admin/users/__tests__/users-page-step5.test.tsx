import { readFileSync } from 'node:fs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
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
const fullPermissions = ['*:*:*'];

beforeAll(async () => {
  await i18nInit;
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  resetDb();
});
afterAll(() => server.close());

function renderUsersPage(search: UsersSearch = defaultSearch, permissions = fullPermissions) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <UsersPage permissions={permissions} search={search} onSearchChange={() => undefined} />
    </QueryClientProvider>,
  );
}

test('MembersScene owns member workflow state and mutations instead of users index', () => {
  const indexSource = readFileSync('src/modules/admin/users/index.tsx', 'utf8');
  const sceneSource = readFileSync('src/modules/admin/users/list/MembersScene.tsx', 'utf8');

  expect(indexSource).not.toMatch(/use(Query|SuspenseQuery|Mutation|QueryClient)\b/);
  expect(sceneSource).toContain('useUserMutations');
  expect(sceneSource).toContain('useState<UserFormState>');
  expect(sceneSource).toContain('setDetailUserId');
  expect(sceneSource).toContain('deleteTarget');
  expect(sceneSource).not.toMatch(/Dispatch<SetStateAction|set[A-Z]\w*:/);
});

test('members scene opens create and edit workflows from semantic callbacks', async () => {
  renderUsersPage();

  await screen.findByText('李长昕');
  await userEvent.click(screen.getByRole('button', { name: '添加成员' }));
  expect(screen.getByRole('dialog', { name: '添加成员' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '取消' }));
  const editButton = screen.getAllByRole('button', { name: '编辑' })[0];
  if (!editButton) throw new Error('edit button missing');
  await userEvent.click(editButton);
  expect(screen.getByRole('dialog', { name: '编辑成员' })).toBeInTheDocument();
});

test('members scene confirms delete through user mutations and refreshes list', async () => {
  renderUsersPage();

  expect(await screen.findByText('李长昕')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '删除李长昕' }));
  expect(screen.getByRole('dialog', { name: '确认删除成员' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '确认删除' }));

  await waitFor(() => expect(screen.queryByText('李长昕')).not.toBeInTheDocument());
});

test('batch disable clears member table selection after mutation succeeds', async () => {
  renderUsersPage();

  await screen.findByText('李长昕');
  const [, firstRowCheckbox] = screen.getAllByRole('checkbox');
  if (!firstRowCheckbox) throw new Error('first row checkbox missing');

  await userEvent.click(firstRowCheckbox);
  expect(screen.getByText('已选 1 人')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '批量禁用' }));

  await waitFor(() => expect(screen.queryByText('已选 1 人')).not.toBeInTheDocument());
  expect(screen.queryByRole('button', { name: '批量禁用' })).not.toBeInTheDocument();
});

test('members table hides row selection when batch disable permission is absent', async () => {
  renderUsersPage(defaultSearch, ['iam:user:view']);

  await screen.findByText('李长昕');

  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  expect(screen.queryByText(/已选 \d+ 人/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '批量禁用' })).not.toBeInTheDocument();
});

test('left variant passes undefined write callbacks and keeps detail read entry only', async () => {
  renderUsersPage({ ...defaultSearch, status: 'left' });

  expect(await screen.findByText('徐若琳')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: '详情' })).toHaveLength(2);
  expect(screen.queryByRole('button', { name: '添加成员' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '删除徐若琳' })).not.toBeInTheDocument();
});
