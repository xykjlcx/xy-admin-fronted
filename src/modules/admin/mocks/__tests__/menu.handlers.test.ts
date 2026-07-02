import { setupServer } from 'msw/node';
import { menuHandlers } from '@/modules/admin/mocks/menu.handlers';

const server = setupServer(...menuHandlers);
beforeAll(() => server.listen());
afterAll(() => server.close());

interface Env<T> {
  code: number;
  data: T;
  message: string;
}

test('GET /api/subsystems 返回子系统种子', async () => {
  const res = (await (await fetch('/api/subsystems')).json()) as Env<{ key: string }[]>;
  expect(res.code).toBe(0);
  expect(res.data.map((s) => s.key)).toContain('admin');
});

test('GET /api/menus?subsystem=admin 返回该子系统菜单', async () => {
  const res = (await (await fetch('/api/menus?subsystem=admin')).json()) as Env<{ id: string }[]>;
  expect(res.code).toBe(0);
  expect(res.data.some((m) => m.id === 'm-dashboard')).toBe(true);
});

test('GET /api/menus?subsystem=nope 未知子系统返回空集', async () => {
  const res = (await (await fetch('/api/menus?subsystem=nope')).json()) as Env<unknown[]>;
  expect(res.data).toHaveLength(0);
});
