import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatedTabs, type AnimatedTabItem } from '@/components/pro/AnimatedTabs';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
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
  const detailTabItems: AnimatedTabItem<DetailTab>[] = [
    { value: 'permissions', label: t('roles.detailTabs.permissions') },
    { value: 'members', label: t('roles.detailTabs.members', { count: roleMembers.length }) },
    { value: 'logs', label: t('roles.detailTabs.logs') },
  ];

  if (!activeRole) {
    return <Empty title={t('roles.empty')} className="flex-1" />;
  }

  return (
    <>
      <div className="mb-1 flex items-center gap-2.5">
        <h1 className="text-[calc(18px*var(--app-scale))] font-bold text-text">{activeRole.name}</h1>
        <RoleTypeChip type={activeRole.type} label={t(`roles.roleTypes.${activeRole.type}`)} />
        <div className="flex-1" />
        {activeRole.type === 'custom' && canDeleteRole && (
          <Button
            type="button"
            variant="text"
            size="sm"
            className="text-danger hover:bg-danger-soft"
            onClick={() => onDeleteRole(activeRole)}
          >
            <Trash2 data-icon="inline-start" />
            {t('roles.actions.deleteRole')}
          </Button>
        )}
      </div>
      <p className="mb-4 text-[calc(13px*var(--app-scale))] text-text-3">{activeRole.desc}</p>

      <AnimatedTabs
        value={detailTab}
        items={detailTabItems}
        onValueChange={onDetailTabChange}
        variant="content"
        className="mb-[calc(18px*var(--app-scale))]"
        trailing={
          roleDetailLoading || roleDetailRefreshing ? (
            <span className="mb-2.5 text-[calc(12px*var(--app-scale))] text-pri">
              {t('roles.refreshing')}
            </span>
          ) : null
        }
      />

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
    <div role="status" aria-label={label} className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          data-testid="role-detail-loading-row"
          className="rounded-10 border border-border p-4"
        >
          <Skeleton className="h-3 w-40" />
          <div className="mt-4 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((__, itemIndex) => (
              <Skeleton key={itemIndex} className="h-[calc(30px*var(--app-scale))] rounded-7" />
            ))}
          </div>
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
