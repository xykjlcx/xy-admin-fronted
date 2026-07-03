import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { userHandlers } from '@/modules/admin/mocks/user.handlers';

const server = setupServer(...userHandlers);
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

test('GET /api/users 支持部门、状态、关键词过滤和分页', async () => {
  const res = (await (
    await fetch('/api/users?page=1&pageSize=5&deptId=rd&status=active&keyword=李')
  ).json()) as Env<Page<UserRow>>;

  expect(res.code).toBe(0);
  expect(res.data.list.length).toBeGreaterThan(0);
  expect(res.data.list.length).toBeLessThanOrEqual(5);
  expect(res.data.list.every((u) => u.deptId === 'rd')).toBe(true);
  expect(res.data.list.every((u) => u.status === 'active')).toBe(true);
  expect(res.data.list.every((u) => u.name.includes('李'))).toBe(true);
});

test('GET /api/users 支持仅查询当前部门直属成员', async () => {
  const recursive = (await (
    await fetch('/api/users?page=1&pageSize=20&deptId=rd&status=all')
  ).json()) as Env<Page<UserRow>>;
  const directOnly = (await (
    await fetch('/api/users?page=1&pageSize=20&deptId=rd&status=all&directOnly=true')
  ).json()) as Env<Page<UserRow>>;

  expect(recursive.data.total).toBeGreaterThan(directOnly.data.total);
  expect(directOnly.data.list.every((u) => u.deptId === 'rd')).toBe(true);
});

test('GET /api/depts 返回随成员写操作变化的部门成员数', async () => {
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

test('POST /api/users 写入后能被列表查询读回', async () => {
  const created = (await (
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '测试成员',
        deptId: 'rd',
        role: '运营',
        phone: '13800000000',
        email: 'test@example.com',
      }),
    })
  ).json()) as Env<UserRow>;
  expect(created.data.name).toBe('测试成员');

  const list = (await (await fetch('/api/users?keyword=测试成员')).json()) as Env<Page<UserRow>>;
  expect(list.data.list.some((u) => u.id === created.data.id)).toBe(true);
});
