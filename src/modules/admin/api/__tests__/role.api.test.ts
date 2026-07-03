import {
  adminRolesQuery,
  permissionTreeQuery,
  roleApi,
  roleLogsQuery,
  roleMembersQuery,
  rolePermissionsQuery,
  rolesQuery,
} from '@/modules/admin/api/role.api';

test('role queryOptions use stable iam query keys', () => {
  expect(rolesQuery.queryKey).toEqual(['iam', 'roles']);
  expect(permissionTreeQuery.queryKey).toEqual(['iam', 'permissions', 'tree']);
  expect(rolePermissionsQuery('hr').queryKey).toEqual(['iam', 'rolePermissions', 'hr']);
  expect(roleMembersQuery('hr').queryKey).toEqual(['iam', 'roleMembers', 'hr']);
  expect(roleLogsQuery('hr').queryKey).toEqual(['iam', 'roleLogs', 'hr']);
  expect(adminRolesQuery.queryKey).toEqual(['iam', 'adminRoles']);
});

test('role api exposes the write operations required by the roles page', () => {
  expect(typeof roleApi.createRole).toBe('function');
  expect(typeof roleApi.deleteRole).toBe('function');
  expect(typeof roleApi.saveRolePermissions).toBe('function');
  expect(typeof roleApi.createAdminRole).toBe('function');
});
