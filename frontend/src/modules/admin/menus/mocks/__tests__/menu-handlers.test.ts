import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import type { CreateMenuInput, CreateSubsystemInput, UpdateMenuInput } from '@/modules/admin/menus/api';
import { menuHandlers } from '@/modules/admin/menus/mocks';
import type { MenuRecord } from '@/modules/types';

const server = setupServer(...menuHandlers);
beforeAll(() => server.listen());
afterEach(() => resetDb());
afterAll(() => server.close());


async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

test('GET /api/subsystems 返回子系统种子', async () => {
  const res = await readJson<{ key: string }[]>(await fetch('/api/subsystems'));
  expect(res.map((s) => s.key)).toContain('admin');
});

test('PUT /api/subsystems/:key 编辑子系统显示信息后可读回', async () => {
  const updated = await readJson<{ key: string; label: Record<string, string>; desc: Record<string, string> }>(
    await fetch('/api/subsystems/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: { 'zh-CN': '基础后台' },
        desc: { 'zh-CN': '组织权限与审计' },
        icon: 'layout-grid',
        color: '#3370ff',
        home: '/admin/dashboard',
        enabled: true,
      }),
    }),
  );
  expect(updated.label).toEqual({ 'zh-CN': '基础后台' });
  expect(updated.desc).toEqual({ 'zh-CN': '组织权限与审计' });

  const list = await readJson<{ key: string; label: Record<string, string> }[]>(
    await fetch('/api/subsystems'),
  );
  expect(list.find((subsystem) => subsystem.key === 'admin')?.label).toEqual({ 'zh-CN': '基础后台' });
});

test('POST /api/subsystems 新增子系统后可读回', async () => {
  const dto: CreateSubsystemInput = {
    key: 'wms',
    label: { 'zh-CN': '仓储执行' },
    desc: { 'zh-CN': '库存 · 波次 · 拣货' },
    icon: 'layout-grid',
    color: '#3370ff',
    home: '/admin/dashboard',
    builtin: false,
    enabled: true,
    sort: 9,
  };

  const created = await readJson<{ key: string; label: Record<string, string>; sort: number }>(
    await fetch('/api/subsystems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    }),
  );
  expect(created).toMatchObject({
    key: 'wms',
    label: { 'zh-CN': '仓储执行' },
    sort: 9,
  });

  const list = await readJson<{ key: string; label: Record<string, string> }[]>(
    await fetch('/api/subsystems'),
  );
  expect(list.find((subsystem) => subsystem.key === 'wms')?.label).toEqual({ 'zh-CN': '仓储执行' });
});

test('GET /api/menus?subsystem=admin 返回该子系统菜单', async () => {
  const res = await readJson<{ id: string }[]>(await fetch('/api/menus?subsystem=admin'));
  expect(res.some((m) => m.id === 'm-dashboard')).toBe(true);
});

test('GET /api/menus?subsystem=nope 未知子系统返回空集', async () => {
  const res = await readJson<unknown[]>(await fetch('/api/menus?subsystem=nope'));
  expect(res).toHaveLength(0);
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

  const created = await readJson<MenuRecord>(
    await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    }),
  );
  expect(created).toMatchObject({
    subsystemKey: 'admin',
    parentId: 'm-org',
    type: 'menu',
    path: '/admin/roles',
    permission: 'iam:menu:view',
  });

  const list = await readJson<MenuRecord[]>(await fetch('/api/menus?subsystem=admin'));
  expect(list.some((menu) => menu.id === created.id)).toBe(true);
});

test('PUT /api/menus/:id 编辑菜单字段后可读回', async () => {
  const dto: UpdateMenuInput = {
    parentId: 'm-home',
    type: 'menu',
    label: { 'zh-CN': '经营总览' },
    icon: 'chart',
    path: '/admin/dashboard',
    permission: 'dashboard:overview:view',
    visible: false,
    sort: 6,
  };

  const updated = await readJson<MenuRecord>(
    await fetch('/api/menus/m-dashboard', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    }),
  );
  expect(updated).toMatchObject({
    id: 'm-dashboard',
    label: { 'zh-CN': '经营总览' },
    icon: 'chart',
    visible: false,
    sort: 6,
  });

  const list = await readJson<MenuRecord[]>(await fetch('/api/menus?subsystem=admin'));
  expect(list.find((menu) => menu.id === 'm-dashboard')?.label).toEqual({ 'zh-CN': '经营总览' });
});

test('PATCH /api/menus/:id/visibility 切换显示状态', async () => {
  const updated = await readJson<MenuRecord>(
    await fetch('/api/menus/m-dashboard/visibility', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: false }),
    }),
  );
  expect(updated.visible).toBe(false);
});

test('DELETE /api/menus/:id 允许删除叶子节点', async () => {
  const removed = await fetch('/api/menus/m-dashboard', { method: 'DELETE' });
  expect(removed.status).toBe(204);

  const list = await readJson<MenuRecord[]>(await fetch('/api/menus?subsystem=admin'));
  expect(list.some((menu) => menu.id === 'm-dashboard')).toBe(false);
});

test('DELETE /api/menus/:id 拒绝删除非叶子节点', async () => {
  const removed = await readJson<{ code: string; detail: string }>(await fetch('/api/menus/m-org', { method: 'DELETE' }));
  expect(removed.code).not.toBe(0);
  expect(removed.detail).toContain('子菜单');
});

test('PUT /api/menus/:id 拒绝把非叶子节点改成其他类型', async () => {
  const updated = await readJson<{ code: string; detail: string }>(
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
  expect(updated.detail).toContain('子菜单');
});

test('POST /api/menus 校验动作节点必须有权限且不能有路由', async () => {
  const invalid = await readJson<{ code: string; detail: string }>(
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
  expect(invalid.detail).toContain('权限');
});

test('POST /api/menus 在执行业务规则前拒绝不合法的路由契约', async () => {
  const invalid = await readJson<{ code: string; detail: string }>(
    await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subsystemKey: 'admin',
        parentId: 'm-org',
        type: 'menu',
        label: { 'zh-CN': '错误路由' },
        path: 'admin/users',
        visible: true,
        sort: 1,
      }),
    }),
  );

  expect(invalid.code).not.toBe(0);
  expect(invalid.detail).toContain('参数');
});
