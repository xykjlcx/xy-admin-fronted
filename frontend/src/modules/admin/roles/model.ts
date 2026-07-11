import type { CreateRoleInput, PermissionResourceDto, RolePermissionMap } from '@/modules/admin/roles/api';

export const avatarClasses = [
  'bg-(--accent-emphasis)',
  'bg-success',
  'bg-warning',
  'bg-danger',
  'bg-text-3',
  'bg-(--accent-emphasis) text-white',
];

export const emptyRoleDraft: CreateRoleInput = { name: '', desc: '' };

export function clonePermissions(permissions: RolePermissionMap): RolePermissionMap {
  return Object.fromEntries(
    Object.entries(permissions).map(([resourceId, actions]) => [resourceId, [...actions]]),
  );
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
