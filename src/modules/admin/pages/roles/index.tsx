import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { PageFrame, PageSurface, PageTabs, type PageTabItem } from '@/components/pro/PageScaffold';
import { matchPermission } from '@/lib/permission';
import {
  adminRolesQuery,
  permissionTreeQuery,
  roleApi,
  roleLogsQuery,
  roleMembersQuery,
  rolePermissionsQuery,
  rolesQuery,
  type CreateAdminRoleInput,
  type CreateRoleInput,
  type RoleDto,
  type RolePermissionMap,
} from '@/modules/admin/api/role.api';
import { usersQuery } from '@/modules/admin/api/user.api';
import { AdminRolesPanel } from './AdminRolesPanel';
import { CreateAdminRoleDialog, CreateRoleDialog } from './RoleDialogs';
import { RoleDetailsPanel } from './RoleDetailsPanel';
import { RoleListPanel } from './RoleListPanel';
import type { DetailTab, PageTab, RolesViewProps, SelectableMemberDto } from './types';

export type { RolesViewProps, SelectableMemberDto };

const emptyRolePermissions: RolePermissionMap = {};

interface RolesPageProps {
  permissions: string[];
  roleId: string;
  onRoleIdChange: (roleId: string) => void;
}

export function RolesPage({ permissions, roleId, onRoleIdChange }: RolesPageProps) {
  // Page 层把左侧角色列表、右侧详情 tabs、管理员角色等数据统一编排。
  // 具体 tab 内容继续拆到 RoleDetailsPanel/RoleMembersPanel 等子组件，保持每块职责单一。
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const { data: roles } = useSuspenseQuery(rolesQuery);
  const { data: permissionTree } = useSuspenseQuery(permissionTreeQuery);
  const { data: adminRoles } = useSuspenseQuery(adminRolesQuery);
  const activeRoleId = roles.some((role) => role.id === roleId) ? roleId : roles[0]?.id ?? '';

  const rolePermissionsResult = useQuery({
    ...rolePermissionsQuery(activeRoleId),
    enabled: !!activeRoleId,
  });
  const roleMembersResult = useQuery({
    ...roleMembersQuery(activeRoleId),
    enabled: !!activeRoleId,
  });
  const roleLogsResult = useQuery({
    ...roleLogsQuery(activeRoleId),
    enabled: !!activeRoleId,
  });
  const usersResult = useQuery(usersQuery({ page: 1, pageSize: 50, status: 'all', keyword: '' }));

  const createRole = useMutation({
    mutationFn: roleApi.createRole,
    onSuccess: async (role) => {
      await queryClient.invalidateQueries({ queryKey: ['iam', 'roles'] });
      onRoleIdChange(role.id);
      toast.success(t('roles.toast.created'));
    },
  });
  const deleteRole = useMutation({
    mutationFn: roleApi.deleteRole,
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: ['iam', 'roles'] });
      const nextRole = roles.find((role) => role.id !== id);
      onRoleIdChange(nextRole?.id ?? '');
      toast.success(t('roles.toast.deleted'));
    },
  });
  const saveRolePermissions = useMutation({
    mutationFn: ({ id, rolePermissions }: { id: string; rolePermissions: RolePermissionMap }) =>
      roleApi.saveRolePermissions(id, rolePermissions),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['iam', 'rolePermissions', variables.id] });
      toast.success(t('roles.toast.permissionsSaved'));
    },
  });
  const createAdminRole = useMutation({
    mutationFn: roleApi.createAdminRole,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['iam', 'adminRoles'] });
      toast.success(t('roles.toast.adminCreated'));
    },
  });

  const roleDetailLoading =
    rolePermissionsResult.isPending || roleMembersResult.isPending || roleLogsResult.isPending;
  const roleDetailRefreshing =
    !roleDetailLoading &&
    (rolePermissionsResult.isFetching || roleMembersResult.isFetching || roleLogsResult.isFetching);

  return (
    <RolesView
      permissions={permissions}
      roles={roles}
      activeRoleId={activeRoleId}
      permissionTree={permissionTree}
      rolePermissions={rolePermissionsResult.data ?? emptyRolePermissions}
      roleMembers={roleMembersResult.data ?? []}
      roleLogs={roleLogsResult.data ?? []}
      adminRoles={adminRoles}
      selectableMembers={(usersResult.data?.list ?? []).map((user) => ({ id: user.id, name: user.name }))}
      roleDetailLoading={roleDetailLoading}
      roleDetailRefreshing={roleDetailRefreshing}
      onActiveRoleChange={onRoleIdChange}
      onCreateRole={async (dto: CreateRoleInput) => {
        await createRole.mutateAsync(dto);
      }}
      onDeleteRole={async (id: string) => {
        await deleteRole.mutateAsync(id);
      }}
      onSaveRolePermissions={async (id: string, rolePermissions: RolePermissionMap) => {
        await saveRolePermissions.mutateAsync({ id, rolePermissions });
      }}
      onCreateAdminRole={async (dto: CreateAdminRoleInput) => {
        await createAdminRole.mutateAsync(dto);
      }}
    />
  );
}

export function RolesView({
  permissions,
  roles,
  activeRoleId,
  permissionTree,
  rolePermissions,
  roleMembers,
  roleLogs,
  adminRoles,
  selectableMembers,
  roleDetailLoading = false,
  roleDetailRefreshing = false,
  onActiveRoleChange,
  onCreateRole,
  onDeleteRole,
  onSaveRolePermissions,
  onCreateAdminRole,
}: RolesViewProps) {
  const { t } = useTranslation('admin');
  const activeRole = roles.find((role) => role.id === activeRoleId) ?? roles[0];
  const currentRoleId = activeRole?.id ?? activeRoleId;
  const [pageTab, setPageTab] = useState<PageTab>('roles');
  const [detailTab, setDetailTab] = useState<DetailTab>('permissions');
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RoleDto | null>(null);
  const canCreateRole = matchPermission(permissions, 'iam:role:create');
  const canDeleteRole = matchPermission(permissions, 'iam:role:del');
  const canGrant = matchPermission(permissions, 'iam:role:grant');
  const canCreateAdmin = matchPermission(permissions, 'iam:admin:create');
  const pageTabItems: PageTabItem<PageTab>[] = [
    { value: 'roles', label: t('roles.tabs.roles') },
    { value: 'admins', label: t('roles.tabs.admins') },
  ];

  const confirmDeleteRole = async () => {
    if (!deleteTarget) return;
    await onDeleteRole(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <PageFrame breadcrumbs={[{ label: t('roles.breadcrumbGroup') }, { label: t('roles.title') }]}>
      <PageSurface>
        <PageTabs value={pageTab} items={pageTabItems} onValueChange={setPageTab} />

        {pageTab === 'roles' ? (
          <div className="flex min-h-0 flex-1">
            <RoleListPanel
              roles={roles}
              currentRoleId={currentRoleId}
              canCreateRole={canCreateRole}
              onActiveRoleChange={onActiveRoleChange}
              onCreateRole={() => setRoleDialogOpen(true)}
            />
            <main className="flex min-w-0 flex-1 flex-col px-7 py-[calc(22px*var(--app-scale))]">
              <RoleDetailsPanel
                activeRole={activeRole}
                currentRoleId={currentRoleId}
                detailTab={detailTab}
                roleMembers={roleMembers}
                roleLogs={roleLogs}
                permissionTree={permissionTree}
                rolePermissions={rolePermissions}
                roleDetailLoading={roleDetailLoading}
                roleDetailRefreshing={roleDetailRefreshing}
                canDeleteRole={canDeleteRole}
                canGrant={canGrant}
                onDetailTabChange={setDetailTab}
                onDeleteRole={setDeleteTarget}
                onSaveRolePermissions={onSaveRolePermissions}
              />
            </main>
          </div>
        ) : (
          <AdminRolesPanel
            adminRoles={adminRoles}
            canCreateAdmin={canCreateAdmin}
            onCreateAdmin={() => setAdminDialogOpen(true)}
          />
        )}
      </PageSurface>

      <CreateRoleDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} onCreateRole={onCreateRole} />
      <CreateAdminRoleDialog
        open={adminDialogOpen}
        selectableMembers={selectableMembers}
        onOpenChange={setAdminDialogOpen}
        onCreateAdminRole={onCreateAdminRole}
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
