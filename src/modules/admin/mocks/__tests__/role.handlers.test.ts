import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { roleHandlers } from '@/modules/admin/mocks/role.handlers';
import type {
  AdminRoleDto,
  RoleDto,
  RolePermissionMap,
} from '@/modules/admin/api/role.api';

const server = setupServer(...roleHandlers);
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

test('GET /api/roles 返回原型业务角色种子', async () => {
  const res = await readEnv<RoleDto[]>(await fetch('/api/roles'));

  expect(res.code).toBe(0);
  expect(res.data.map((role) => role.name)).toEqual(['人事', '财务', 'IT', '法务', '运营']);
  expect(res.data.filter((role) => role.type === 'custom')).toHaveLength(1);
});

test('POST /api/roles 新增自定义角色后可读回', async () => {
  const created = await readEnv<RoleDto>(
    await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '客服', desc: '负责客服流程' }),
    }),
  );
  expect(created.data).toMatchObject({ name: '客服', type: 'custom', desc: '负责客服流程' });

  const list = await readEnv<RoleDto[]>(await fetch('/api/roles'));
  expect(list.data.some((role) => role.id === created.data.id)).toBe(true);
});

test('系统角色禁止删除，自定义角色允许删除', async () => {
  const systemDelete = await readEnv<null>(await fetch('/api/roles/hr', { method: 'DELETE' }));
  expect(systemDelete.code).not.toBe(0);

  const customDelete = await readEnv<null>(await fetch('/api/roles/ops', { method: 'DELETE' }));
  expect(customDelete.code).toBe(0);

  const list = await readEnv<RoleDto[]>(await fetch('/api/roles'));
  expect(list.data.some((role) => role.id === 'ops')).toBe(false);
});

test('角色权限保存后可读回', async () => {
  const permissions: RolePermissionMap = {
    'iam:user': ['view'],
    'sys:pref': ['view', 'edit'],
  };

  const saved = await readEnv<RolePermissionMap>(
    await fetch('/api/roles/hr/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permissions),
    }),
  );
  expect(saved.data).toEqual(permissions);

  const reread = await readEnv<RolePermissionMap>(await fetch('/api/roles/hr/permissions'));
  expect(reread.data).toEqual(permissions);
});

test('POST /api/admin-roles 新增管理员角色后可读回', async () => {
  const created = await readEnv<AdminRoleDto>(
    await fetch('/api/admin-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '客服管理员', admin: '王思远', scope: '客服管理' }),
    }),
  );
  expect(created.data).toMatchObject({ name: '客服管理员', admin: '王思远', type: 'custom' });

  const list = await readEnv<AdminRoleDto[]>(await fetch('/api/admin-roles'));
  expect(list.data.some((role) => role.id === created.data.id)).toBe(true);
});
