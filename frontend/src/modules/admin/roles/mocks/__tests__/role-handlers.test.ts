import { http } from 'msw';
import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { biz } from '@/mocks/http';
import { roleHandlers } from '@/modules/admin/roles/mocks';
import type {
  RoleAuditLogDto,
  RoleDataPermission,
  RoleDto,
  RolePermissionMap,
} from '@/modules/admin/roles/api';

const server = setupServer(
  ...roleHandlers,
  http.all('*', () => biz(4040, '接口不存在')),
);
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

test('GET /api/roles 返回统一角色种子', async () => {
  const res = await readEnv<RoleDto[]>(await fetch('/api/roles'));

  expect(res.code).toBe(0);
  expect(res.data.map((role) => role.name)).toEqual([
    '超级管理员',
    '平台负责人',
    '人事',
    '财务',
    'IT',
    '法务',
    '运营',
    '日志审计员',
    '文件管理员',
  ]);
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

test('角色数据权限保存时清理无效部门并可读回', async () => {
  const permission: RoleDataPermission = {
    defaultScope: 'dept',
    defaultDepartmentIds: ['hr'],
    resources: {
      members: { scope: 'inherit', departmentIds: ['fin'] },
      files: { scope: 'custom', departmentIds: ['rd', 'fin'] },
    },
  };

  const saved = await readEnv<RoleDataPermission>(
    await fetch('/api/roles/hr/data-permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permission),
    }),
  );
  expect(saved.code).toBe(0);
  expect(saved.data).toEqual({
    defaultScope: 'dept',
    defaultDepartmentIds: [],
    resources: {
      members: { scope: 'inherit', departmentIds: [] },
      files: { scope: 'custom', departmentIds: ['rd', 'fin'] },
    },
  });

  const reread = await readEnv<RoleDataPermission>(await fetch('/api/roles/hr/data-permissions'));
  expect(reread.data).toEqual(saved.data);
});

test('GET /api/role-audit-logs 汇总全部角色变更', async () => {
  const res = await readEnv<RoleAuditLogDto[]>(await fetch('/api/role-audit-logs'));

  expect(res.code).toBe(0);
  expect(res.data.some((log) => log.roleName === '财务' && log.operator === '李长昕')).toBe(true);
  expect(res.data.every((log) => log.occurredAt && log.change)).toBe(true);
});

test('保存角色数据权限后追加全局审计记录', async () => {
  const before = await readEnv<RoleAuditLogDto[]>(await fetch('/api/role-audit-logs'));

  await fetch('/api/roles/fin/data-permissions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      defaultScope: 'deptAndChildren',
      defaultDepartmentIds: [],
      resources: {},
    } satisfies RoleDataPermission),
  });

  const after = await readEnv<RoleAuditLogDto[]>(await fetch('/api/role-audit-logs'));
  expect(after.data).toHaveLength(before.data.length + 1);
  expect(after.data[0]).toMatchObject({ roleId: 'fin', roleName: '财务', kind: 'dataScope' });
});

test('创建角色、保存功能权限和删除角色都会追加审计记录', async () => {
  const before = await readEnv<RoleAuditLogDto[]>(await fetch('/api/role-audit-logs'));

  await fetch('/api/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '客服', desc: '负责客服流程' }),
  });
  await fetch('/api/roles/hr/permissions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 'iam:user': ['view', 'create'] }),
  });
  await fetch('/api/roles/ops', { method: 'DELETE' });

  const after = await readEnv<RoleAuditLogDto[]>(await fetch('/api/role-audit-logs'));
  expect(after.data).toHaveLength(before.data.length + 3);
  expect(after.data).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ roleName: '客服', kind: 'create' }),
      expect.objectContaining({ roleId: 'hr', kind: 'grant' }),
      expect.objectContaining({ roleId: 'ops', kind: 'remove' }),
    ]),
  );
});

test('角色 mock 不再暴露管理员角色和角色内日志接口', () => {
  const source = readFileSync('src/modules/admin/roles/mocks/role.handlers.ts', 'utf8');
  expect(source).not.toContain('/api/admin-roles');
  expect(source).not.toContain('/api/roles/:id/logs');
  expect(source).not.toContain('AdminRoleDto');
});

import { readFileSync } from 'node:fs';
