import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type {
  PermissionTreeGroupDto,
  RoleDto,
  RoleLogDto,
  RoleMemberDto,
  RolePermissionMap,
} from '@/modules/admin/api/role.api';
import { RoleTypeChip } from './RoleTypeChip';
import { RolePermissionEditor } from './RolePermissionEditor';
import { RoleMembersPanel } from './RoleMembersPanel';
import { RoleLogsPanel } from './RoleLogsPanel';
import type { DetailTab } from './types';

export function RoleDetailsPanel({
  activeRole,
  currentRoleId,
  detailTab,
  roleMembers,
  roleLogs,
  permissionTree,
  rolePermissions,
  roleDetailLoading,
  roleDetailRefreshing,
  canDeleteRole,
  canGrant,
  onDetailTabChange,
  onDeleteRole,
  onSaveRolePermissions,
}: {
  activeRole: RoleDto | undefined;
  currentRoleId: string;
  detailTab: DetailTab;
  roleMembers: RoleMemberDto[];
  roleLogs: RoleLogDto[];
  permissionTree: PermissionTreeGroupDto[];
  rolePermissions: RolePermissionMap;
  roleDetailLoading: boolean;
  roleDetailRefreshing: boolean;
  canDeleteRole: boolean;
  canGrant: boolean;
  onDetailTabChange: (tab: DetailTab) => void;
  onDeleteRole: (role: RoleDto) => void;
  onSaveRolePermissions: (id: string, permissions: RolePermissionMap) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');

  if (!activeRole) {
    return <div className="flex flex-1 items-center justify-center text-sm text-text-3">{t('roles.empty')}</div>;
  }

  return (
    <>
      <div className="mb-1 flex items-center gap-2.5">
        <h1 className="text-[calc(18px*var(--app-scale))] font-bold text-text">{activeRole.name}</h1>
        <RoleTypeChip type={activeRole.type} label={t(`roles.roleTypes.${activeRole.type}`)} />
        <div className="flex-1" />
        {activeRole.type === 'custom' && canDeleteRole && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[calc(13px*var(--app-scale))] text-danger"
            onClick={() => onDeleteRole(activeRole)}
          >
            <Trash2 className="size-3.5" />
            {t('roles.actions.deleteRole')}
          </button>
        )}
      </div>
      <p className="mb-4 text-[calc(13px*var(--app-scale))] text-text-3">{activeRole.desc}</p>

      <div className="mb-[calc(18px*var(--app-scale))] flex items-end border-b border-border" role="tablist">
        {[
          ['permissions', t('roles.detailTabs.permissions')],
          ['members', t('roles.detailTabs.members', { count: roleMembers.length })],
          ['logs', t('roles.detailTabs.logs')],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={detailTab === key}
            className={cn(
              'mr-6 border-b-2 px-1 pb-2.5 text-sm',
              detailTab === key ? 'border-pri font-semibold text-pri' : 'border-transparent text-text-2',
            )}
            onClick={() => onDetailTabChange(key as DetailTab)}
          >
            {label}
          </button>
        ))}
        {(roleDetailLoading || roleDetailRefreshing) && (
          <span className="mb-2.5 ml-auto text-[calc(12px*var(--app-scale))] text-pri">
            {t('roles.refreshing')}
          </span>
        )}
      </div>

      {roleDetailLoading ? (
        <RoleDetailLoadingState label={t('roles.refreshing')} />
      ) : detailTab === 'permissions' ? (
        <RolePermissionEditor
          roleId={currentRoleId}
          permissionTree={permissionTree}
          rolePermissions={rolePermissions}
          canGrant={canGrant}
          onSave={onSaveRolePermissions}
        />
      ) : detailTab === 'members' ? (
        <RoleMembersPanel members={roleMembers} />
      ) : (
        <RoleLogsPanel logs={roleLogs} />
      )}
    </>
  );
}

function RoleDetailLoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: 4 }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          data-testid="role-detail-loading-row"
          className="rounded-10 border border-border p-4"
        >
          <div className="h-3 w-40 animate-pulse rounded-4 bg-surface-2" />
          <div className="mt-4 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((__, itemIndex) => (
              <div
                key={itemIndex}
                className="h-[calc(30px*var(--app-scale))] animate-pulse rounded-7 bg-surface-2"
              />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
