import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import type { CreateMenuInput, UpdateMenuInput } from '@/modules/admin/api/menu.api';
import { menuHandlers } from '@/modules/admin/mocks/menu.handlers';
import type { MenuRecord } from '@/modules/types';

const server = setupServer(...menuHandlers);
beforeAll(() => server.listen());
afterEach(() => resetDb());
afterAll(() => server.close());

interface Env<T> {
  code: number;
  data: T;
  message: string;
}

async function readEnv<T>(response: Response) {
  return (await response.json()) as Env<T>;
}

test('GET /api/subsystems 返回子系统种子', async () => {
  const res = await readEnv<{ key: string }[]>(await fetch('/api/subsystems'));
  expect(res.code).toBe(0);
  expect(res.data.map((s) => s.key)).toContain('admin');
});

test('GET /api/menus?subsystem=admin 返回该子系统菜单', async () => {
  const res = await readEnv<{ id: string }[]>(await fetch('/api/menus?subsystem=admin'));
  expect(res.code).toBe(0);
  expect(res.data.some((m) => m.id === 'm-dashboard')).toBe(true);
});

test('GET /api/menus?subsystem=nope 未知子系统返回空集', async () => {
  const res = await readEnv<unknown[]>(await fetch('/api/menus?subsystem=nope'));
  expect(res.data).toHaveLength(0);
});

test('POST /api/menus 新增菜单节点后可读回', async () => {
  const dto: CreateMenuInput = {
    subsystemKey: 'admin',
    parentId: 'm-org',
    type: 'menu',
    label: { 'zh-CN': '权限看板' },
    icon: 'menu',
    path: '/admin/roles',
    permission: 'iam:menu:view',
    visible: true,
    sort: 9,
  };

  const created = await readEnv<MenuRecord>(
    await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    }),
  );
  expect(created.code).toBe(0);
  expect(created.data).toMatchObject({
    subsystemKey: 'admin',
    parentId: 'm-org',
    type: 'menu',
    path: '/admin/roles',
    permission: 'iam:menu:view',
  });

  const list = await readEnv<MenuRecord[]>(await fetch('/api/menus?subsystem=admin'));
  expect(list.data.some((menu) => menu.id === created.data.id)).toBe(true);
});

test('PUT /api/menus/:id 编辑菜单字段后可读回', async () => {
  const dto: UpdateMenuInput = {
    parentId: 'm-home',
    type: 'menu',
    label: { 'zh-CN': '经营总览' },
    icon: 'chart',
    path: '/admin/dashboard',
    permission: 'dashboard:view',
    visible: false,
    sort: 6,
  };

  const updated = await readEnv<MenuRecord>(
    await fetch('/api/menus/m-dashboard', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    }),
  );
  expect(updated.code).toBe(0);
  expect(updated.data).toMatchObject({
    id: 'm-dashboard',
    label: { 'zh-CN': '经营总览' },
    icon: 'chart',
    visible: false,
    sort: 6,
  });

  const list = await readEnv<MenuRecord[]>(await fetch('/api/menus?subsystem=admin'));
  expect(list.data.find((menu) => menu.id === 'm-dashboard')?.label).toEqual({ 'zh-CN': '经营总览' });
});

test('PATCH /api/menus/:id/visibility 切换显示状态', async () => {
  const updated = await readEnv<MenuRecord>(
    await fetch('/api/menus/m-dashboard/visibility', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: false }),
    }),
  );

  expect(updated.code).toBe(0);
  expect(updated.data.visible).toBe(false);
});

test('DELETE /api/menus/:id 允许删除叶子节点', async () => {
  const removed = await readEnv<null>(await fetch('/api/menus/m-dashboard', { method: 'DELETE' }));
  expect(removed.code).toBe(0);

  const list = await readEnv<MenuRecord[]>(await fetch('/api/menus?subsystem=admin'));
  expect(list.data.some((menu) => menu.id === 'm-dashboard')).toBe(false);
});

test('DELETE /api/menus/:id 拒绝删除非叶子节点', async () => {
  const removed = await readEnv<null>(await fetch('/api/menus/m-org', { method: 'DELETE' }));
  expect(removed.code).not.toBe(0);
  expect(removed.message).toContain('子菜单');
});

test('PUT /api/menus/:id 拒绝把非叶子节点改成其他类型', async () => {
  const updated = await readEnv<null>(
    await fetch('/api/menus/m-org', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentId: null,
        type: 'menu',
        label: { 'zh-CN': '组织入口' },
        path: '/admin/users',
        permission: 'iam:user:view',
        visible: true,
        sort: 2,
      }),
    }),
  );
  expect(updated.code).not.toBe(0);
  expect(updated.message).toContain('子菜单');
});

test('POST /api/menus 校验动作节点必须有权限且不能有路由', async () => {
  const invalid = await readEnv<null>(
    await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subsystemKey: 'admin',
        parentId: 'm-users',
        type: 'action',
        label: { 'zh-CN': '导出' },
        path: '/admin/users',
        visible: true,
        sort: 1,
      }),
    }),
  );
  expect(invalid.code).not.toBe(0);
  expect(invalid.message).toContain('权限');
});
