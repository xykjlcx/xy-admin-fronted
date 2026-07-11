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
      resources: {},
    }),
  ).toEqual({
    defaultScope: 'dept',
    defaultDepartmentIds: [],
    resources: {},
  });
});

test('real role data scope is role-level only and preserves all five wire values', () => {
  const { RoleDataPermissionSchema, normalizeRoleDataPermission } = roleModule;
  for (const defaultScope of ['all', 'deptAndChildren', 'dept', 'self', 'custom'] as const) {
    const parsed = RoleDataPermissionSchema.parse({
      defaultScope,
      defaultDepartmentIds: defaultScope === 'custom' ? ['018f4c52-3e77-7c42-a9d8-5d6629a4c101'] : [],
      resources: {},
    });
    expect(normalizeRoleDataPermission(parsed).resources).toEqual({});
  }
  expect(
    RoleDataPermissionSchema.safeParse({
      defaultScope: 'self',
      defaultDepartmentIds: [],
      resources: { users: { scope: 'all', departmentIds: [] } },
    }).success,
  ).toBe(false);
});

test('real role contract exposes detail, update and disable endpoints', () => {
  expect(typeof roleModule.roleDetailQuery).toBe('function');
  expect(typeof roleModule.roleApi.updateRole).toBe('function');
  expect(typeof roleModule.roleApi.disableRole).toBe('function');
});
