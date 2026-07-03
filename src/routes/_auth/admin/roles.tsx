import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
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
  type RolePermissionMap,
} from '@/modules/admin/api/role.api';
import { usersQuery } from '@/modules/admin/api/user.api';
import { RolesView } from '@/modules/admin/components/roles/RolesView';

const searchSchema = z.object({
  roleId: z.string().catch(''),
});
const emptyRolePermissions: RolePermissionMap = {};

export const Route = createFileRoute('/_auth/admin/roles')({
  validateSearch: searchSchema,
  staticData: {
    labelKey: 'roles.title',
    permission: 'iam:role:view',
    groupKey: 'roles.breadcrumbGroup',
    actions: [
      { code: 'iam:role:create', labelKey: 'roles.actions.addRole' },
      { code: 'iam:role:del', labelKey: 'roles.actions.deleteRole' },
      { code: 'iam:role:grant', labelKey: 'roles.actions.savePermissions' },
      { code: 'iam:admin:create', labelKey: 'roles.actions.createAdmin' },
    ],
  },
  component: RolesPage,
});

function RolesPage() {
  const { t } = useTranslation('admin');
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const { data: roles } = useSuspenseQuery(rolesQuery);
  const { data: permissionTree } = useSuspenseQuery(permissionTreeQuery);
  const { data: adminRoles } = useSuspenseQuery(adminRolesQuery);
  const activeRoleId = roles.some((role) => role.id === search.roleId)
    ? search.roleId
    : roles[0]?.id ?? '';

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
  const usersResult = useQuery(
    usersQuery({ page: 1, pageSize: 50, status: 'all', keyword: '' }),
  );

  const createRole = useMutation({
    mutationFn: roleApi.createRole,
    onSuccess: async (role) => {
      await queryClient.invalidateQueries({ queryKey: ['iam', 'roles'] });
      void navigate({ search: { roleId: role.id } });
      toast.success(t('roles.toast.created'));
    },
  });
  const deleteRole = useMutation({
    mutationFn: roleApi.deleteRole,
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: ['iam', 'roles'] });
      const nextRole = roles.find((role) => role.id !== id);
      void navigate({ search: nextRole ? { roleId: nextRole.id } : { roleId: '' } });
      toast.success(t('roles.toast.deleted'));
    },
  });
  const saveRolePermissions = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: RolePermissionMap }) =>
      roleApi.saveRolePermissions(id, permissions),
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

  const roleDetailRefreshing =
    rolePermissionsResult.isFetching || roleMembersResult.isFetching || roleLogsResult.isFetching;

  return (
    <RolesView
      permissions={me.permissions}
      roles={roles}
      activeRoleId={activeRoleId}
      permissionTree={permissionTree}
      rolePermissions={rolePermissionsResult.data ?? emptyRolePermissions}
      roleMembers={roleMembersResult.data ?? []}
      roleLogs={roleLogsResult.data ?? []}
      adminRoles={adminRoles}
      selectableMembers={(usersResult.data?.list ?? []).map((user) => ({ id: user.id, name: user.name }))}
      roleDetailRefreshing={roleDetailRefreshing}
      onActiveRoleChange={(roleId) => {
        void navigate({ search: { roleId } });
      }}
      onCreateRole={async (dto: CreateRoleInput) => {
        await createRole.mutateAsync(dto);
      }}
      onDeleteRole={async (id: string) => {
        await deleteRole.mutateAsync(id);
      }}
      onSaveRolePermissions={async (id: string, permissions: RolePermissionMap) => {
        await saveRolePermissions.mutateAsync({ id, permissions });
      }}
      onCreateAdminRole={async (dto: CreateAdminRoleInput) => {
        await createAdminRole.mutateAsync(dto);
      }}
    />
  );
}
