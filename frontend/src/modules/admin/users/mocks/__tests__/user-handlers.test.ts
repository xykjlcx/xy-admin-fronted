import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { UserDetailSchema, type UserDetailDto } from '@/modules/admin/users/api';
import { usersModuleHandlers } from '@/modules/admin/users/mocks';

const server = setupServer(...usersModuleHandlers);
beforeAll(() => server.listen());
afterEach(() => resetDb());
afterAll(() => server.close());


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
  ).json()) as Page<UserRow>;
  expect(list.list.length).toBeGreaterThan(0);
  expect(list.list.every((user) => user.deptId === 'rd')).toBe(true);
  expect(list.list.every((user) => user.status === 'active')).toBe(true);

  const detail = (await (await fetch(`/api/users/${list.list[0]!.id}`)).json()) as UserDetailDto;
  expect(UserDetailSchema.safeParse(detail).success).toBe(true);
  expect(detail.id).toBe(list.list[0]!.id);
});

test('users module handlers keep department member counts in sync with writes', async () => {
  const before = (await (await fetch('/api/depts')).json()) as DeptRow[];
  const rdBefore = before.find((dept) => dept.id === 'rd')?.memberCount;
  const feBefore = before.find((dept) => dept.id === 'rd_fe')?.memberCount;

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

  const after = (await (await fetch('/api/depts')).json()) as DeptRow[];
  expect(after.find((dept) => dept.id === 'rd')?.memberCount).toBe((rdBefore ?? 0) + 1);
  expect(after.find((dept) => dept.id === 'rd_fe')?.memberCount).toBe((feBefore ?? 0) + 1);
});

test('users module handlers apply advanced filters from query params', async () => {
  const filters = encodeURIComponent(JSON.stringify([
    { id: 'f1', field: 'phone', operator: 'contains', value: '9982' },
    { id: 'f2', field: 'status', operator: 'eq', value: 'left' },
  ]));

  const list = (await (
    await fetch(`/api/users?page=1&pageSize=10&status=left&filters=${filters}`)
  ).json()) as Page<UserRow>;
  expect(list.total).toBe(1);
  expect(list.list[0]?.name).toBe('唐一鸣');
});

test('demo batch enable and move use the same wire dialect as real IAM', async () => {
  const page = (await (await fetch('/api/users?page=1&pageSize=1&status=active')).json()) as Page<UserRow>;
  const id = page.list[0]!.id;
  await fetch('/api/users/batch-disable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
  const enabled = await fetch('/api/users/batch-enable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
  await expect(enabled.json()).resolves.toEqual({ updated: 1 });
  const moved = await fetch('/api/users/batch-move', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], deptId: 'rd_fe' }) });
  await expect(moved.json()).resolves.toEqual({ updated: 1 });
  const detail = (await (await fetch(`/api/users/${id}`)).json()) as UserDetailDto;
  expect(detail).toMatchObject({ status: 'active', deptId: 'rd_fe' });
});

test('department handlers create and update departments', async () => {
  const created = (await (
    await fetch('/api/depts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '客户成功部', parentId: null }),
    })
  ).json()) as DeptRow & { name: string };
  expect(created.name).toBe('客户成功部');

  const updated = (await (
    await fetch(`/api/depts/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '客户增长部' }),
    })
  ).json()) as DeptRow & { name: string };
  expect(updated.name).toBe('客户增长部');

  const all = (await (await fetch('/api/depts')).json()) as (DeptRow & { name: string })[];
  expect(all.some((dept) => dept.name === '客户增长部')).toBe(true);
});
