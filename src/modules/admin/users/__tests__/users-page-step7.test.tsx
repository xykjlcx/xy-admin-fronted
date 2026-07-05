import { existsSync, readFileSync } from 'node:fs';
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

test('user form package uses react-hook-form with zod resolver and no draft useState', () => {
  expect(existsSync('src/modules/admin/users/form/UserFormDialog.tsx')).toBe(true);
  expect(existsSync('src/modules/admin/users/form/useUserForm.ts')).toBe(true);
  const hookSource = readFileSync('src/modules/admin/users/form/useUserForm.ts', 'utf8');
  const dialogSource = readFileSync('src/modules/admin/users/form/UserFormDialog.tsx', 'utf8');
  const sceneSource = readFileSync('src/modules/admin/users/list/MembersScene.tsx', 'utf8');

  expect(hookSource).toContain('useForm');
  expect(hookSource).toContain('zodResolver(CreateUserSchema)');
  expect(dialogSource).toContain('formState.isValid');
  expect(dialogSource).not.toContain('useState');
  expect(sceneSource).toContain('../form/UserFormDialog');
  expect(sceneSource).not.toContain('@/modules/admin/pages/users/UserFormDialog');
});

test('create form validation is driven by zod email validity before submit', async () => {
  renderUsersPage();

  await screen.findByText('李长昕');
  await userEvent.click(screen.getByRole('button', { name: '添加成员' }));
  const saveButton = screen.getByRole('button', { name: '保存' });

  await userEvent.type(screen.getByPlaceholderText('姓名'), '测试成员');
  await userEvent.type(screen.getByPlaceholderText('角色'), '测试工程师');
  await userEvent.type(screen.getByPlaceholderText('手机号'), '+86 130 0000 0000');
  await userEvent.type(screen.getByPlaceholderText('邮箱'), 'bad-email');
  expect(saveButton).toBeDisabled();

  await userEvent.clear(screen.getByPlaceholderText('邮箱'));
  await userEvent.type(screen.getByPlaceholderText('邮箱'), 'tester@example.com');
  await waitFor(() => expect(saveButton).toBeEnabled());
});
