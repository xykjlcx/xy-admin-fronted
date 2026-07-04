import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/lib/http/client';
import { defineApiContract } from '@/lib/http/contract';

// 角色页包含列表、权限树、成员、日志等多个协作数据源。
// queryKey 按资源拆开，保存权限后才能按前缀精准失效，而不是刷新整页。
const RoleTypeSchema = z.enum(['system', 'custom']);
const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: RoleTypeSchema,
  desc: z.string(),
  memberDeptId: z.string().optional(),
});
const PermissionActionSchema = z.object({
  id: z.string(),
  label: z.string(),
});
const PermissionResourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  code: z.string(),
  actions: z.array(PermissionActionSchema),
});
const PermissionTreeGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  resources: z.array(PermissionResourceSchema),
});
const RolePermissionMapSchema = z.record(z.string(), z.array(z.string()));
const RoleMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  deptLabel: z.string(),
  title: z.string(),
});
const RoleLogKindSchema = z.enum(['grant', 'add', 'remove', 'edit', 'create']);
const RoleLogSchema = z.object({
  id: z.string(),
  kind: RoleLogKindSchema,
  who: z.string(),
  text: z.string(),
  time: z.string(),
});
const AdminRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: RoleTypeSchema,
  admin: z.string(),
  scope: z.string(),
});
const NullSchema = z.null();

const rolesContract = defineApiContract({ response: z.array(RoleSchema) });
const permissionTreeContract = defineApiContract({ response: z.array(PermissionTreeGroupSchema) });
const rolePermissionsContract = defineApiContract({ response: RolePermissionMapSchema });
const roleMembersContract = defineApiContract({ response: z.array(RoleMemberSchema) });
const roleLogsContract = defineApiContract({ response: z.array(RoleLogSchema) });
const adminRolesContract = defineApiContract({ response: z.array(AdminRoleSchema) });
const roleContract = defineApiContract({ response: RoleSchema });
const adminRoleContract = defineApiContract({ response: AdminRoleSchema });
const nullContract = defineApiContract({ response: NullSchema });

export type RoleType = z.infer<typeof RoleTypeSchema>;

export type RoleDto = z.infer<typeof RoleSchema>;

export type PermissionActionDto = z.infer<typeof PermissionActionSchema>;

export type PermissionResourceDto = z.infer<typeof PermissionResourceSchema>;

export type PermissionTreeGroupDto = z.infer<typeof PermissionTreeGroupSchema>;

export type RolePermissionMap = z.infer<typeof RolePermissionMapSchema>;

export type RoleMemberDto = z.infer<typeof RoleMemberSchema>;

export type RoleLogKind = z.infer<typeof RoleLogKindSchema>;

export type RoleLogDto = z.infer<typeof RoleLogSchema>;

export type AdminRoleDto = z.infer<typeof AdminRoleSchema>;

export interface CreateRoleInput {
  name: string;
  desc?: string;
}

export interface CreateAdminRoleInput {
  name: string;
  admin: string;
  scope?: string;
}

export const rolesQuery = queryOptions({
  queryKey: ['iam', 'roles'],
  queryFn: () => http.get('/api/roles', undefined, rolesContract),
});

export const permissionTreeQuery = queryOptions({
  queryKey: ['iam', 'permissions', 'tree'],
  queryFn: () => http.get('/api/permissions/tree', undefined, permissionTreeContract),
});

export const rolePermissionsQuery = (roleId: string) =>
  queryOptions({
    queryKey: ['iam', 'rolePermissions', roleId],
    queryFn: () => http.get(`/api/roles/${roleId}/permissions`, undefined, rolePermissionsContract),
  });

export const roleMembersQuery = (roleId: string) =>
  queryOptions({
    queryKey: ['iam', 'roleMembers', roleId],
    queryFn: () => http.get(`/api/roles/${roleId}/members`, undefined, roleMembersContract),
  });

export const roleLogsQuery = (roleId: string) =>
  queryOptions({
    queryKey: ['iam', 'roleLogs', roleId],
    queryFn: () => http.get(`/api/roles/${roleId}/logs`, undefined, roleLogsContract),
  });

export const adminRolesQuery = queryOptions({
  queryKey: ['iam', 'adminRoles'],
  queryFn: () => http.get('/api/admin-roles', undefined, adminRolesContract),
});

export const roleApi = {
  createRole: (dto: CreateRoleInput) => http.post('/api/roles', dto, roleContract),
  deleteRole: (id: string) => http.del(`/api/roles/${id}`, nullContract),
  saveRolePermissions: (id: string, permissions: RolePermissionMap) =>
    http.put(`/api/roles/${id}/permissions`, permissions, rolePermissionsContract),
  createAdminRole: (dto: CreateAdminRoleInput) => http.post('/api/admin-roles', dto, adminRoleContract),
};
