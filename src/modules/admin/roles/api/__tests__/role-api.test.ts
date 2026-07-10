import * as roleModule from '@/modules/admin/roles/api';

test('role queries share one stable key factory', () => {
  const moduleRecord = roleModule as Record<string, unknown>;
  expect(moduleRecord).toHaveProperty('roleKeys');

  const {
    roleKeys,
    rolesQuery,
    permissionTreeQuery,
    rolePermissionsQuery,
    roleDataPermissionsQuery,
    roleMembersQuery,
    roleAuditLogsQuery,
  } = roleModule as typeof roleModule & {
    roleKeys: {
      all: readonly string[];
      list: () => readonly string[];
      permissionTree: () => readonly string[];
      permissions: (roleId: string) => readonly string[];
      dataPermissions: (roleId: string) => readonly string[];
      members: (roleId: string) => readonly string[];
      auditLogs: () => readonly string[];
    };
    roleDataPermissionsQuery: (roleId: string) => { queryKey: readonly unknown[] };
    roleAuditLogsQuery: { queryKey: readonly unknown[] };
  };

  expect(rolesQuery.queryKey).toEqual(roleKeys.list());
  expect(permissionTreeQuery.queryKey).toEqual(roleKeys.permissionTree());
  expect(rolePermissionsQuery('hr').queryKey).toEqual(roleKeys.permissions('hr'));
  expect(roleDataPermissionsQuery('hr').queryKey).toEqual(roleKeys.dataPermissions('hr'));
  expect(roleMembersQuery('hr').queryKey).toEqual(roleKeys.members('hr'));
  expect(roleAuditLogsQuery.queryKey).toEqual(roleKeys.auditLogs());
});

test('role api exposes unified role writes without the legacy admin branch', () => {
  expect(typeof roleModule.roleApi.createRole).toBe('function');
  expect(typeof roleModule.roleApi.deleteRole).toBe('function');
  expect(typeof roleModule.roleApi.saveRolePermissions).toBe('function');
  expect(roleModule.roleApi).toHaveProperty('saveRoleDataPermissions');
  expect(roleModule.roleApi).not.toHaveProperty('createAdminRole');
  expect(roleModule).not.toHaveProperty('adminRolesQuery');
});

test('data permission normalization removes department ids from non-custom scopes', () => {
  expect(
    roleModule.normalizeRoleDataPermission({
      defaultScope: 'dept',
      defaultDepartmentIds: ['hr'],
      resources: {
        members: { scope: 'inherit', departmentIds: ['fin'] },
        files: { scope: 'custom', departmentIds: ['rd', 'fin'] },
      },
    }),
  ).toEqual({
    defaultScope: 'dept',
    defaultDepartmentIds: [],
    resources: {
      members: { scope: 'inherit', departmentIds: [] },
      files: { scope: 'custom', departmentIds: ['rd', 'fin'] },
    },
  });
});
