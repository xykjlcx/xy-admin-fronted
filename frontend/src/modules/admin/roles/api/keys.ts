export const roleKeys = {
  all: ['iam', 'roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  permissionTree: () => [...roleKeys.all, 'permissionTree'] as const,
  permissions: (roleId: string) => [...roleKeys.all, 'permissions', roleId] as const,
  dataPermissions: (roleId: string) => [...roleKeys.all, 'dataPermissions', roleId] as const,
  members: (roleId: string) => [...roleKeys.all, 'members', roleId] as const,
  auditLogs: () => [...roleKeys.all, 'auditLogs'] as const,
};
