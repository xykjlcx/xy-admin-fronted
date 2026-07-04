import type {
  CreateAdminRoleInput,
  CreateRoleInput,
  PermissionResourceDto,
  RoleLogKind,
  RolePermissionMap,
} from '@/modules/admin/api/role.api';

export const adminGridTemplate = '1.2fr 1fr 1.8fr calc(140px * var(--app-scale))';

export const avatarClasses = [
  'bg-(--nav-item-fg-current)',
  'bg-success',
  'bg-warning',
  'bg-danger',
  'bg-text-3',
  'bg-(--nav-item-fg-current) text-white',
];

export const logToneClass: Record<RoleLogKind, string> = {
  grant: 'bg-success-soft text-success',
  add: 'bg-info-soft text-info',
  remove: 'bg-danger-soft text-danger',
  edit: 'bg-warning-soft text-warning',
  create: 'bg-info-soft text-info',
};

export const emptyRoleDraft: CreateRoleInput = { name: '', desc: '' };
export const emptyAdminDraft: CreateAdminRoleInput = { name: '', admin: '' };

export function clonePermissions(permissions: RolePermissionMap): RolePermissionMap {
  return Object.fromEntries(Object.entries(permissions).map(([resourceId, actions]) => [resourceId, [...actions]]));
}

export function cleanPermissions(permissions: RolePermissionMap): RolePermissionMap {
  return Object.fromEntries(
    Object.entries(permissions)
      .map<[string, string[]]>(([resourceId, actions]) => [resourceId, [...new Set(actions)]])
      .filter(([, actions]) => actions.length > 0),
  );
}

export function initials(name: string) {
  return name.slice(-2);
}

export function actionList(resource: PermissionResourceDto) {
  return resource.actions.map((action) => action.id);
}
