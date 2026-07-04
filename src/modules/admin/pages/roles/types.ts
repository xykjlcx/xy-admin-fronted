import type {
  AdminRoleDto,
  CreateAdminRoleInput,
  CreateRoleInput,
  PermissionTreeGroupDto,
  RoleDto,
  RoleLogDto,
  RoleMemberDto,
  RolePermissionMap,
} from '@/modules/admin/api/role.api';

export interface SelectableMemberDto {
  id: string;
  name: string;
}

export interface RolesViewProps {
  permissions: string[];
  roles: RoleDto[];
  activeRoleId: string;
  permissionTree: PermissionTreeGroupDto[];
  rolePermissions: RolePermissionMap;
  roleMembers: RoleMemberDto[];
  roleLogs: RoleLogDto[];
  adminRoles: AdminRoleDto[];
  selectableMembers: SelectableMemberDto[];
  roleDetailLoading?: boolean;
  roleDetailRefreshing?: boolean;
  onActiveRoleChange: (id: string) => void;
  onCreateRole: (dto: CreateRoleInput) => void | Promise<void>;
  onDeleteRole: (id: string) => void | Promise<void>;
  onSaveRolePermissions: (id: string, permissions: RolePermissionMap) => void | Promise<void>;
  onCreateAdminRole: (dto: CreateAdminRoleInput) => void | Promise<void>;
}

export type PageTab = 'roles' | 'admins';
export type DetailTab = 'permissions' | 'members' | 'logs';
export type TriState = 'none' | 'some' | 'all';
export type PermissionDraftUpdater = RolePermissionMap | ((current: RolePermissionMap) => RolePermissionMap);

export interface PermissionDraftState {
  roleId: string;
  source: RolePermissionMap;
  draft: RolePermissionMap;
}
