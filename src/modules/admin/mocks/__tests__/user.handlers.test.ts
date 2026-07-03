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
