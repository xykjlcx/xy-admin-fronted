import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import {
  adminRolesQuery,
  permissionTreeQuery,
  roleLogsQuery,
  roleMembersQuery,
  rolePermissionsQuery,
  rolesQuery,
} from '@/modules/admin/api/role.api';
import { usersQuery } from '@/modules/admin/api/user.api';
import { RolesPage } from '@/modules/admin/pages/roles';

// roleId 放在 URL search 中，让“选中某个角色”可刷新、可复制链接，也不会触发 Shell 重建。
const searchSchema = z.object({
  roleId: z.string().catch(''),
});

export const Route = createFileRoute('/_auth/admin/roles')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ roleId: search.roleId }),
  loader: async ({ context, deps }) => {
    // 角色详情右侧多个 tab 共享 activeRoleId，loader 只预热当前角色所需数据。
    // 后续切换角色时只更新角色详情相关 query，不影响全局布局。
    const [roles] = await Promise.all([
      context.queryClient.ensureQueryData(rolesQuery),
      context.queryClient.ensureQueryData(permissionTreeQuery),
      context.queryClient.ensureQueryData(adminRolesQuery),
    ]);
    const activeRoleId = roles.some((role) => role.id === deps.roleId)
      ? deps.roleId
      : roles[0]?.id ?? '';

    await Promise.all([
      activeRoleId
        ? context.queryClient.ensureQueryData(rolePermissionsQuery(activeRoleId))
        : Promise.resolve(),
      activeRoleId
        ? context.queryClient.ensureQueryData(roleMembersQuery(activeRoleId))
        : Promise.resolve(),
      activeRoleId ? context.queryClient.ensureQueryData(roleLogsQuery(activeRoleId)) : Promise.resolve(),
      context.queryClient.ensureQueryData(
        usersQuery({ page: 1, pageSize: 50, status: 'all', keyword: '' }),
      ),
    ]);
  },
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
  component: RolesRoute,
});

function RolesRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();

  return (
    <RolesPage
      permissions={me.permissions}
      roleId={search.roleId}
      onRoleIdChange={(roleId) => {
        void navigate({ search: { roleId } });
      }}
    />
  );
}
