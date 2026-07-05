import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { UserDetailSchema, type UserDetailDto } from '@/modules/admin/users/api';
import { usersModuleHandlers } from '@/modules/admin/users/mocks';

const server = setupServer(...usersModuleHandlers);
beforeAll(() => server.listen());
afterEach(() => resetDb());
afterAll(() => server.close());

interface Env<T> {
  code: number;
  data: T;
  message: string;
}

interface Page<T> {
  list: T[];
  total: number;
}

interface UserRow {
  id: string;
  name: string;
  deptId: string;
  status: string;
}

interface DeptRow {
  id: string;
  parentId: string | null;
  memberCount: number;
}

test('users module handlers expose list filters and detail shape', async () => {
  const list = (await (
    await fetch('/api/users?page=1&pageSize=5&deptId=rd&status=active&keyword=李')
  ).json()) as Env<Page<UserRow>>;

  expect(list.code).toBe(0);
  expect(list.data.list.length).toBeGreaterThan(0);
  expect(list.data.list.every((user) => user.deptId === 'rd')).toBe(true);
  expect(list.data.list.every((user) => user.status === 'active')).toBe(true);

  const detail = (await (await fetch(`/api/users/${list.data.list[0]!.id}`)).json()) as Env<UserDetailDto>;
  expect(detail.code).toBe(0);
  expect(UserDetailSchema.safeParse(detail.data).success).toBe(true);
  expect(detail.data.id).toBe(list.data.list[0]!.id);
});

test('users module handlers keep department member counts in sync with writes', async () => {
  const before = (await (await fetch('/api/depts')).json()) as Env<DeptRow[]>;
  const rdBefore = before.data.find((dept) => dept.id === 'rd')?.memberCount;
  const feBefore = before.data.find((dept) => dept.id === 'rd_fe')?.memberCount;

  await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '新增前端',
      deptId: 'rd_fe',
      role: '前端工程师',
      phone: '13800000001',
      email: 'frontend@example.com',
    }),
  });

  const after = (await (await fetch('/api/depts')).json()) as Env<DeptRow[]>;
  expect(after.data.find((dept) => dept.id === 'rd')?.memberCount).toBe((rdBefore ?? 0) + 1);
  expect(after.data.find((dept) => dept.id === 'rd_fe')?.memberCount).toBe((feBefore ?? 0) + 1);
});
