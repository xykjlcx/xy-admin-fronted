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
  http.all('*', () => biz({ status: 404, code: 'test.endpoint.not-found', detail: '接口不存在' })),
);
beforeAll(() => server.listen());
afterEach(() => resetDb());
afterAll(() => server.close());


async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

test('GET /api/roles 返回统一角色种子', async () => {
  const res = await readJson<RoleDto[]>(await fetch('/api/roles'));
  expect(res.map((role) => role.name)).toEqual([
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
  const created = await readJson<RoleDto>(
    await fetch('/api/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '客服', desc: '负责客服流程' }),
    }),
  );
  expect(created).toMatchObject({ name: '客服', type: 'custom', desc: '负责客服流程' });

  const list = await readJson<RoleDto[]>(await fetch('/api/roles'));
  expect(list.some((role) => role.id === created.id)).toBe(true);
});

test('POST /api/roles 空角色名返回 400 ProblemDetail', async () => {
  const response = await fetch('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: ' ', desc: '' }) });
  expect(response.status).toBe(400);
  expect(response.headers.get('content-type')).toContain('application/problem+json');
  await expect(response.json()).resolves.toMatchObject({ status: 400, code: 'role.name.invalid', detail: '角色名称不能为空' });
});

test('系统角色禁止删除，自定义角色允许删除', async () => {
  const systemDelete = await readJson<{ code: string; detail: string }>(await fetch('/api/roles/hr', { method: 'DELETE' }));
  expect(systemDelete.code).not.toBe(0);

  const customDelete = await fetch('/api/roles/ops', { method: 'DELETE' });
  expect(customDelete.status).toBe(204);

  const list = await readJson<RoleDto[]>(await fetch('/api/roles'));
  expect(list.some((role) => role.id === 'ops')).toBe(false);
});

test('角色权限保存后可读回', async () => {
  const permissions: RolePermissionMap = {
    'iam:user': ['view'],
    'sys:pref': ['view', 'edit'],
  };

  const saved = await readJson<RolePermissionMap>(
    await fetch('/api/roles/hr/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permissions),
    }),
  );
  expect(saved).toEqual(permissions);

  const reread = await readJson<RolePermissionMap>(await fetch('/api/roles/hr/permissions'));
  expect(reread).toEqual(permissions);
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

  const saved = await readJson<RoleDataPermission>(
    await fetch('/api/roles/hr/data-permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permission),
    }),
  );
  expect(saved).toEqual({
    defaultScope: 'dept',
    defaultDepartmentIds: [],
    resources: {
      members: { scope: 'inherit', departmentIds: [] },
      files: { scope: 'custom', departmentIds: ['rd', 'fin'] },
    },
  });

  const reread = await readJson<RoleDataPermission>(await fetch('/api/roles/hr/data-permissions'));
  expect(reread).toEqual(saved);
});

test('GET /api/role-audit-logs 汇总全部角色变更', async () => {
  const res = await readJson<RoleAuditLogDto[]>(await fetch('/api/role-audit-logs'));
  expect(res.some((log) => log.roleName === '财务' && log.operator === '李长昕')).toBe(true);
  expect(res.every((log) => log.occurredAt && log.change)).toBe(true);
});

test('保存角色数据权限后追加全局审计记录', async () => {
  const before = await readJson<RoleAuditLogDto[]>(await fetch('/api/role-audit-logs'));

  await fetch('/api/roles/fin/data-permissions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      defaultScope: 'deptAndChildren',
      defaultDepartmentIds: [],
      resources: {},
    } satisfies RoleDataPermission),
  });

  const after = await readJson<RoleAuditLogDto[]>(await fetch('/api/role-audit-logs'));
  expect(after).toHaveLength(before.length + 1);
  expect(after[0]).toMatchObject({ roleId: 'fin', roleName: '财务', kind: 'dataScope' });
});

test('创建角色、保存功能权限和删除角色都会追加审计记录', async () => {
  const before = await readJson<RoleAuditLogDto[]>(await fetch('/api/role-audit-logs'));

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

  const after = await readJson<RoleAuditLogDto[]>(await fetch('/api/role-audit-logs'));
  expect(after).toHaveLength(before.length + 3);
  expect(after).toEqual(
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
