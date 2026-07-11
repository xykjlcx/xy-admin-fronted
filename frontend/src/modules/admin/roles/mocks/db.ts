import { createCollection } from '@/mocks/db';
import type {
  RoleAuditLogDto,
  RoleDataPermission,
  RoleDto,
  RolePermissionMap,
} from '@/modules/admin/roles/api';

export interface RolePermissionRow {
  roleId: string;
  permissions: RolePermissionMap;
}

export interface RoleDataPermissionRow {
  roleId: string;
  permission: RoleDataPermission;
}

export interface RoleMockSeeds {
  roles: readonly RoleDto[];
  permissions: readonly RolePermissionRow[];
  dataPermissions: readonly RoleDataPermissionRow[];
  auditLogs: readonly RoleAuditLogDto[];
}

export function createRoleMockDb(seeds: RoleMockSeeds) {
  return {
    roles: createCollection<RoleDto, 'id'>(seeds.roles, 'id'),
    rolePermissions: createCollection<RolePermissionRow, 'roleId'>(seeds.permissions, 'roleId'),
    roleDataPermissions: createCollection<RoleDataPermissionRow, 'roleId'>(seeds.dataPermissions, 'roleId'),
    roleAuditLogs: createCollection<RoleAuditLogDto, 'id'>(seeds.auditLogs, 'id'),
  };
}
