import type {
  CreateRoleInput,
  PermissionTreeGroupDto,
  RoleAuditLogDto,
  RoleDataPermission,
  RoleDto,
  RoleMemberDto,
  RolePermissionMap,
} from '@/modules/admin/roles/api';
import type { DeptDto } from '@/modules/admin/users/api';

export interface RolesViewProps {
  permissions: string[];
  systemAdmin?: boolean;
  roles: RoleDto[];
  activeRoleId: string;
  permissionTree: PermissionTreeGroupDto[];
  rolePermissions: RolePermissionMap;
  roleDataPermission: RoleDataPermission;
  departments: Pick<DeptDto, 'id' | 'name'>[];
  roleMembers: RoleMemberDto[];
  roleAuditLogs: RoleAuditLogDto[];
  roleDetailLoading?: boolean;
  roleDetailRefreshing?: boolean;
  roleAuditLogsLoading?: boolean;
  onActiveRoleChange: (id: string) => void;
  onCreateRole: (dto: CreateRoleInput) => void | Promise<void>;
  onUpdateRole?: (id: string, dto: CreateRoleInput) => void | Promise<void>;
  onDisableRole?: (id: string) => void | Promise<void>;
  onDeleteRole: (id: string) => void | Promise<void>;
  onSaveRolePermissions: (id: string, permissions: RolePermissionMap) => void | Promise<void>;
  onSaveRoleDataPermissions: (id: string, permission: RoleDataPermission) => void | Promise<void>;
}

export type PageTab = 'roles' | 'auditLogs';
export type DetailTab = 'permissions' | 'dataPermissions' | 'members';
export type TriState = 'none' | 'some' | 'all';
export type PermissionDraftUpdater = RolePermissionMap | ((current: RolePermissionMap) => RolePermissionMap);

export interface PermissionDraftState {
  roleId: string;
  source: RolePermissionMap;
  draft: RolePermissionMap;
}
