import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatedTabs, type AnimatedTabItem } from '@/components/pro/AnimatedTabs';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  PermissionTreeGroupDto,
  RoleDataPermission,
  RoleDto,
  RoleMemberDto,
  RolePermissionMap,
} from '@/modules/admin/roles/api';
import type { DeptDto } from '@/modules/admin/users/api';
import { RoleDataPermissionEditor } from './RoleDataPermissionEditor';
import { RoleTypeChip } from '../components/RoleTypeChip';
import { RolePermissionEditor } from './RolePermissionEditor';
import { RoleMembersPanel } from './RoleMembersPanel';
import type { DetailTab } from '../types';

export function RoleDetailsPanel({
  activeRole,
  currentRoleId,
  detailTab,
  roleMembers,
  permissionTree,
  rolePermissions,
  roleDataPermission,
  departments,
  roleDetailLoading,
  roleDetailRefreshing,
  canDeleteRole,
  canGrant,
  onDetailTabChange,
  onDeleteRole,
  onSaveRolePermissions,
  onSaveRoleDataPermissions,
}: {
  activeRole: RoleDto | undefined;
  currentRoleId: string;
  detailTab: DetailTab;
  roleMembers: RoleMemberDto[];
  permissionTree: PermissionTreeGroupDto[];
  rolePermissions: RolePermissionMap;
  roleDataPermission: RoleDataPermission;
  departments: Pick<DeptDto, 'id' | 'name'>[];
  roleDetailLoading: boolean;
  roleDetailRefreshing: boolean;
  canDeleteRole: boolean;
  canGrant: boolean;
  onDetailTabChange: (tab: DetailTab) => void;
  onDeleteRole: (role: RoleDto) => void;
  onSaveRolePermissions: (id: string, permissions: RolePermissionMap) => void | Promise<void>;
  onSaveRoleDataPermissions: (id: string, permission: RoleDataPermission) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const detailTabItems: AnimatedTabItem<DetailTab>[] = [
    { value: 'permissions', label: t('roles.detailTabs.permissions') },
    { value: 'dataPermissions', label: t('roles.detailTabs.dataPermissions') },
    { value: 'members', label: t('roles.detailTabs.members', { count: roleMembers.length }) },
  ];

  if (!activeRole) {
    return <Empty title={t('roles.empty')} className="flex-1" />;
  }

  return (
    <div data-role-detail-layout className="flex min-h-full flex-col">
      <div className="mb-1 flex items-center gap-2.5">
        <h1 className="text-base font-bold text-text">{activeRole.name}</h1>
        <RoleTypeChip type={activeRole.type} label={t(`roles.roleTypes.${activeRole.type}`)} />
        <div className="flex-1" />
        {activeRole.type === 'custom' && canDeleteRole ? (
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
        ) : null}
      </div>
      <p className="mb-3 text-[calc(13px*var(--app-scale))] text-text-3">{activeRole.desc}</p>

      <AnimatedTabs
        value={detailTab}
        items={detailTabItems}
        onValueChange={onDetailTabChange}
        variant="content"
        className="mb-4"
        trailing={
          roleDetailLoading || roleDetailRefreshing ? (
            <span className="mb-2.5 text-[calc(12px*var(--app-scale))] text-(--accent-emphasis)">
              {t('roles.refreshing')}
            </span>
          ) : null
        }
      />

      {roleDetailLoading ? (
        <div data-role-tab-content-scroll className="pb-6 pr-1">
          <RoleDetailLoadingState label={t('roles.refreshing')} />
        </div>
      ) : detailTab === 'permissions' ? (
        <RolePermissionEditor
          key={currentRoleId}
          roleId={currentRoleId}
          permissionTree={permissionTree}
          rolePermissions={rolePermissions}
          canGrant={canGrant}
          onSave={onSaveRolePermissions}
        />
      ) : detailTab === 'dataPermissions' ? (
        <RoleDataPermissionEditor
          roleId={currentRoleId}
          permission={roleDataPermission}
          departments={departments}
          canGrant={canGrant}
          onSave={onSaveRoleDataPermissions}
        />
      ) : (
        <div data-role-tab-content-scroll className="pb-6 pr-1">
          <RoleMembersPanel members={roleMembers} />
        </div>
      )}
    </div>
  );
}

function RoleDetailLoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-2.5">
      {Array.from({ length: 4 }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          data-testid="role-detail-loading-row"
          className="rounded-10 border border-border p-3"
        >
          <Skeleton className="h-3 w-40" />
          <div className="mt-3 grid grid-cols-4 gap-2">
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
