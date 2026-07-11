import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { PageFrame, PageSurface, PageTabs, type PageTabItem } from '@/components/pro/PageScaffold';
import { matchPermission } from '@/lib/permission';
import { meQuery } from '@/modules/admin/auth/api';
import { menuKeys } from '@/modules/admin/menus/api';
import {
  permissionTreeQuery,
  roleApi,
  roleAuditLogsQuery,
  roleDataPermissionsQuery,
  roleKeys,
  roleMembersQuery,
  rolePermissionsQuery,
  rolesQuery,
  type CreateRoleInput,
  type RoleDataPermission,
  type RoleDto,
  type RolePermissionMap,
} from '@/modules/admin/roles/api';
import { deptsQuery } from '@/modules/admin/users/api';
import { CreateRoleDialog, EditRoleDialog } from '../form/RoleDialogs';
import { RoleAuditLogsPanel } from './RoleAuditLogsPanel';
import { RoleDetailsPanel } from '../detail/RoleDetailsPanel';
import { RoleListPanel } from './RoleListPanel';
import type { DetailTab, PageTab, RolesViewProps } from '../types';

export type { RolesViewProps };

const emptyRolePermissions: RolePermissionMap = {};
const emptyRoleDataPermission: RoleDataPermission = {
  defaultScope: 'self',
  defaultDepartmentIds: [],
  resources: {},
};

export interface RolesPageProps {
  permissions: string[];
  systemAdmin?: boolean;
  roleId: string;
  onRoleIdChange: (roleId: string) => void;
}

export function RolesScene({ permissions, systemAdmin = false, roleId, onRoleIdChange }: RolesPageProps) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const router = useRouter({ warn: false });
  const invalidateAuthorization = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: meQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: menuKeys.menuLists() }),
    ]);
    await router?.invalidate();
  };
  const { data: roles } = useSuspenseQuery(rolesQuery);
  const { data: permissionTree } = useSuspenseQuery(permissionTreeQuery);
  const { data: departments } = useSuspenseQuery(deptsQuery);
  const activeRoleId = roles.some((role) => role.id === roleId) ? roleId : (roles[0]?.id ?? '');
  const rolePermissionsResult = useQuery({
    ...rolePermissionsQuery(activeRoleId),
    enabled: !!activeRoleId,
  });
  const roleDataPermissionResult = useQuery({
    ...roleDataPermissionsQuery(activeRoleId),
    enabled: !!activeRoleId,
  });
  const roleMembersResult = useQuery({
    ...roleMembersQuery(activeRoleId),
    enabled: !!activeRoleId,
  });
  const roleAuditLogsResult = useQuery(roleAuditLogsQuery);

  const createRole = useMutation({
    mutationFn: roleApi.createRole,
    onSuccess: async (role) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roleKeys.list() }),
        queryClient.invalidateQueries({ queryKey: roleKeys.auditLogs() }),
      ]);
      await invalidateAuthorization();
      onRoleIdChange(role.id);
      toast.success(t('roles.toast.created'));
    },
  });
  const deleteRole = useMutation({
    mutationFn: roleApi.deleteRole,
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roleKeys.list() }),
        queryClient.invalidateQueries({ queryKey: roleKeys.auditLogs() }),
      ]);
      await invalidateAuthorization();
      const nextRole = roles.find((role) => role.id !== id);
      onRoleIdChange(nextRole?.id ?? '');
      toast.success(t('roles.toast.deleted'));
    },
  });
  const updateRole = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateRoleInput }) => roleApi.updateRole(id, dto),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roleKeys.list() }),
        queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.id) }),
        queryClient.invalidateQueries({ queryKey: roleKeys.auditLogs() }),
      ]);
      await invalidateAuthorization();
      toast.success(t('roles.toast.updated'));
    },
  });
  const disableRole = useMutation({
    mutationFn: roleApi.disableRole,
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roleKeys.list() }),
        queryClient.invalidateQueries({ queryKey: roleKeys.detail(id) }),
        queryClient.invalidateQueries({ queryKey: roleKeys.auditLogs() }),
      ]);
      await invalidateAuthorization();
      toast.success(t('roles.toast.disabled'));
    },
  });
  const saveRolePermissions = useMutation({
    mutationFn: ({ id, rolePermissions }: { id: string; rolePermissions: RolePermissionMap }) =>
      roleApi.saveRolePermissions(id, rolePermissions),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roleKeys.permissions(variables.id) }),
        queryClient.invalidateQueries({ queryKey: roleKeys.auditLogs() }),
      ]);
      await invalidateAuthorization();
      toast.success(t('roles.toast.permissionsSaved'));
    },
  });
  const saveRoleDataPermissions = useMutation({
    mutationFn: ({ id, permission }: { id: string; permission: RoleDataPermission }) =>
      roleApi.saveRoleDataPermissions(id, permission),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: roleKeys.dataPermissions(variables.id) }),
        queryClient.invalidateQueries({ queryKey: roleKeys.auditLogs() }),
      ]);
      await invalidateAuthorization();
      toast.success(t('roles.toast.dataPermissionsSaved'));
    },
  });

  const roleDetailLoading =
    rolePermissionsResult.isPending || roleDataPermissionResult.isPending || roleMembersResult.isPending;
  const roleDetailRefreshing =
    !roleDetailLoading &&
    (rolePermissionsResult.isFetching || roleDataPermissionResult.isFetching || roleMembersResult.isFetching);

  return (
    <RolesView
      permissions={permissions}
      systemAdmin={systemAdmin}
      roles={roles}
      activeRoleId={activeRoleId}
      permissionTree={permissionTree}
      rolePermissions={rolePermissionsResult.data ?? emptyRolePermissions}
      roleDataPermission={roleDataPermissionResult.data ?? emptyRoleDataPermission}
      departments={departments.map(({ id, name }) => ({ id, name }))}
      roleMembers={roleMembersResult.data ?? []}
      roleAuditLogs={roleAuditLogsResult.data ?? []}
      roleDetailLoading={roleDetailLoading}
      roleDetailRefreshing={roleDetailRefreshing}
      roleAuditLogsLoading={roleAuditLogsResult.isPending}
      onActiveRoleChange={onRoleIdChange}
      onCreateRole={async (dto: CreateRoleInput) => {
        await createRole.mutateAsync(dto);
      }}
      onDeleteRole={async (id: string) => {
        await deleteRole.mutateAsync(id);
      }}
      onUpdateRole={async (id, dto) => { await updateRole.mutateAsync({ id, dto }); }}
      onDisableRole={async (id) => { await disableRole.mutateAsync(id); }}
      onSaveRolePermissions={async (id: string, rolePermissions: RolePermissionMap) => {
        await saveRolePermissions.mutateAsync({ id, rolePermissions });
      }}
      onSaveRoleDataPermissions={async (id: string, permission: RoleDataPermission) => {
        await saveRoleDataPermissions.mutateAsync({ id, permission });
      }}
    />
  );
}

export function RolesView({
  permissions,
  systemAdmin = false,
  roles,
  activeRoleId,
  permissionTree,
  rolePermissions,
  roleDataPermission,
  departments,
  roleMembers,
  roleAuditLogs,
  roleDetailLoading = false,
  roleDetailRefreshing = false,
  roleAuditLogsLoading = false,
  onActiveRoleChange,
  onCreateRole,
  onDeleteRole,
  onUpdateRole = async () => undefined,
  onDisableRole = async () => undefined,
  onSaveRolePermissions,
  onSaveRoleDataPermissions,
}: RolesViewProps) {
  const { t } = useTranslation('admin');
  const activeRole = roles.find((role) => role.id === activeRoleId) ?? roles[0];
  const currentRoleId = activeRole?.id ?? activeRoleId;
  const [pageTab, setPageTab] = useState<PageTab>('roles');
  const [detailTab, setDetailTab] = useState<DetailTab>('permissions');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);
  const [editTarget, setEditTarget] = useState<RoleDto | null>(null);
  const canCreateRole = matchPermission({ permissions, systemAdmin }, 'iam:role:create');
  const canDeleteRole = matchPermission({ permissions, systemAdmin }, 'iam:role:del');
  const canGrant = matchPermission({ permissions, systemAdmin }, 'iam:role:grant');
  const pageTabItems: PageTabItem<PageTab>[] = [
    { value: 'roles', label: t('roles.tabs.roles') },
    { value: 'auditLogs', label: t('roles.tabs.auditLogs') },
  ];

  const confirmDeleteRole = async () => {
    if (!deleteTarget) return;
    try {
      await onDeleteRole(deleteTarget.id);
    } catch {
      return;
    }
    setDeleteTarget(null);
  };

  return (
    <PageFrame
      data-role-page-frame
      breadcrumbs={[{ label: t('roles.breadcrumbGroup') }, { label: t('roles.title') }]}
      className="h-[calc(100vh-3.5rem)] overflow-hidden"
    >
      <PageSurface data-role-page-surface className="min-h-0 flex-1">
        <PageTabs value={pageTab} items={pageTabItems} onValueChange={setPageTab} />

        {pageTab === 'roles' ? (
          <div data-role-workspace className="flex min-h-0 flex-1 overflow-hidden">
            <RoleListPanel
              roles={roles}
              currentRoleId={currentRoleId}
              canCreateRole={canCreateRole}
              onActiveRoleChange={onActiveRoleChange}
              onCreateRole={() => setRoleDialogOpen(true)}
            />
            <main
              data-role-detail-shell
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain border-l border-(--page-section-divider) px-(--page-scene-px) py-(--page-scene-py)"
            >
              <RoleDetailsPanel
                activeRole={activeRole}
                currentRoleId={currentRoleId}
                detailTab={detailTab}
                roleMembers={roleMembers}
                permissionTree={permissionTree}
                rolePermissions={rolePermissions}
                roleDataPermission={roleDataPermission}
                departments={departments}
                roleDetailLoading={roleDetailLoading}
                roleDetailRefreshing={roleDetailRefreshing}
                canDeleteRole={canDeleteRole}
                canGrant={canGrant}
                onDetailTabChange={setDetailTab}
                onDeleteRole={setDeleteTarget}
                onUpdateRole={(role) => setEditTarget(role)}
                onDisableRole={onDisableRole}
                onSaveRolePermissions={onSaveRolePermissions}
                onSaveRoleDataPermissions={onSaveRoleDataPermissions}
              />
            </main>
          </div>
        ) : (
          <RoleAuditLogsPanel logs={roleAuditLogs} roles={roles} loading={roleAuditLogsLoading} />
        )}
      </PageSurface>

      <CreateRoleDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} onCreateRole={onCreateRole} />
      <EditRoleDialog
        open={!!editTarget}
        role={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onUpdateRole={async (id, dto) => {
          await onUpdateRole(id, dto);
          setEditTarget(null);
        }}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('roles.dialog.deleteRoleTitle')}
        description={t('roles.dialog.deleteRoleDesc')}
        cancelText={t('roles.actions.cancel')}
        confirmText={t('roles.actions.confirmDelete')}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={confirmDeleteRole}
      />
    </PageFrame>
  );
}
