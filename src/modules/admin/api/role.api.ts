import { queryOptions } from '@tanstack/react-query';
import { http } from '@/lib/http/client';

export type RoleType = 'system' | 'custom';

export interface RoleDto {
  id: string;
  name: string;
  type: RoleType;
  desc: string;
  memberDeptId?: string;
}

export interface PermissionActionDto {
  id: string;
  label: string;
}

export interface PermissionResourceDto {
  id: string;
  label: string;
  code: string;
  actions: PermissionActionDto[];
}

export interface PermissionTreeGroupDto {
  id: string;
  label: string;
  resources: PermissionResourceDto[];
}

export type RolePermissionMap = Record<string, string[]>;

export interface RoleMemberDto {
  id: string;
  name: string;
  deptLabel: string;
  title: string;
}

export type RoleLogKind = 'grant' | 'add' | 'remove' | 'edit' | 'create';

export interface RoleLogDto {
  id: string;
  kind: RoleLogKind;
  who: string;
  text: string;
  time: string;
}

export interface AdminRoleDto {
  id: string;
  name: string;
  type: RoleType;
  admin: string;
  scope: string;
}

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
  queryFn: () => http.get<RoleDto[]>('/api/roles'),
});

export const permissionTreeQuery = queryOptions({
  queryKey: ['iam', 'permissions', 'tree'],
  queryFn: () => http.get<PermissionTreeGroupDto[]>('/api/permissions/tree'),
});

export const rolePermissionsQuery = (roleId: string) =>
  queryOptions({
    queryKey: ['iam', 'rolePermissions', roleId],
    queryFn: () => http.get<RolePermissionMap>(`/api/roles/${roleId}/permissions`),
  });

export const roleMembersQuery = (roleId: string) =>
  queryOptions({
    queryKey: ['iam', 'roleMembers', roleId],
    queryFn: () => http.get<RoleMemberDto[]>(`/api/roles/${roleId}/members`),
  });

export const roleLogsQuery = (roleId: string) =>
  queryOptions({
    queryKey: ['iam', 'roleLogs', roleId],
    queryFn: () => http.get<RoleLogDto[]>(`/api/roles/${roleId}/logs`),
  });

export const adminRolesQuery = queryOptions({
  queryKey: ['iam', 'adminRoles'],
  queryFn: () => http.get<AdminRoleDto[]>('/api/admin-roles'),
});

export const roleApi = {
  createRole: (dto: CreateRoleInput) => http.post<RoleDto>('/api/roles', dto),
  deleteRole: (id: string) => http.del<null>(`/api/roles/${id}`),
  saveRolePermissions: (id: string, permissions: RolePermissionMap) =>
    http.put<RolePermissionMap>(`/api/roles/${id}/permissions`, permissions),
  createAdminRole: (dto: CreateAdminRoleInput) => http.post<AdminRoleDto>('/api/admin-roles', dto),
};
