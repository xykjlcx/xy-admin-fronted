import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/lib/http/client';
import { defineApiContract } from '@/lib/http/contract';
import { roleKeys } from './keys';
import {
  CreateRoleSchema,
  NullSchema,
  PermissionTreeGroupSchema,
  RoleAuditLogSchema,
  RoleDataPermissionSchema,
  RoleMemberSchema,
  RolePermissionMapSchema,
  RoleSchema,
  type CreateRoleInput,
  type RoleDataPermission,
  type RolePermissionMap,
} from './schema';

const rolesContract = defineApiContract({ response: z.array(RoleSchema) });
const permissionTreeContract = defineApiContract({ response: z.array(PermissionTreeGroupSchema) });
const rolePermissionsContract = defineApiContract({ response: RolePermissionMapSchema });
const roleMembersContract = defineApiContract({ response: z.array(RoleMemberSchema) });
const roleDataPermissionContract = defineApiContract({ response: RoleDataPermissionSchema });
const roleAuditLogsContract = defineApiContract({ response: z.array(RoleAuditLogSchema) });
const roleContract = defineApiContract({ response: RoleSchema });
const nullContract = defineApiContract({ response: NullSchema });

export function normalizeRoleDataPermission(value: RoleDataPermission): RoleDataPermission {
  return RoleDataPermissionSchema.parse({
    defaultScope: value.defaultScope,
    defaultDepartmentIds: value.defaultScope === 'custom' ? value.defaultDepartmentIds : [],
    resources: Object.fromEntries(
      Object.entries(value.resources).map(([resourceId, permission]) => [
        resourceId,
        {
          scope: permission.scope,
          departmentIds: permission.scope === 'custom' ? permission.departmentIds : [],
        },
      ]),
    ),
  });
}

export const rolesQuery = queryOptions({
  queryKey: roleKeys.list(),
  queryFn: ({ signal }) => http.get('/api/roles', undefined, rolesContract, { signal }),
});

export const permissionTreeQuery = queryOptions({
  queryKey: roleKeys.permissionTree(),
  queryFn: ({ signal }) => http.get('/api/permissions/tree', undefined, permissionTreeContract, { signal }),
});

export const rolePermissionsQuery = (roleId: string) =>
  queryOptions({
    queryKey: roleKeys.permissions(roleId),
    queryFn: ({ signal }) =>
      http.get(`/api/roles/${roleId}/permissions`, undefined, rolePermissionsContract, { signal }),
  });

export const roleDataPermissionsQuery = (roleId: string) =>
  queryOptions({
    queryKey: roleKeys.dataPermissions(roleId),
    queryFn: ({ signal }) =>
      http.get(`/api/roles/${roleId}/data-permissions`, undefined, roleDataPermissionContract, { signal }),
  });

export const roleMembersQuery = (roleId: string) =>
  queryOptions({
    queryKey: roleKeys.members(roleId),
    queryFn: ({ signal }) =>
      http.get(`/api/roles/${roleId}/members`, undefined, roleMembersContract, { signal }),
  });

export const roleAuditLogsQuery = queryOptions({
  queryKey: roleKeys.auditLogs(),
  queryFn: ({ signal }) => http.get('/api/role-audit-logs', undefined, roleAuditLogsContract, { signal }),
});

export const roleApi = {
  createRole: (dto: CreateRoleInput) => http.post('/api/roles', CreateRoleSchema.parse(dto), roleContract),
  deleteRole: (id: string) => http.del(`/api/roles/${id}`, nullContract),
  saveRolePermissions: (id: string, permissions: RolePermissionMap) =>
    http.put(
      `/api/roles/${id}/permissions`,
      RolePermissionMapSchema.parse(permissions),
      rolePermissionsContract,
    ),
  saveRoleDataPermissions: (id: string, permission: RoleDataPermission) =>
    http.put(
      `/api/roles/${id}/data-permissions`,
      normalizeRoleDataPermission(RoleDataPermissionSchema.parse(permission)),
      roleDataPermissionContract,
    ),
};
