import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { UsersPage } from '@/modules/admin/users';
import {
  deptsQuery,
  usersQuery,
  type UsersQueryParams,
} from '@/modules/admin/users/api';
import type { UsersSearch } from '@/modules/admin/users/types';

// 路由文件保持“薄”：只负责 URL search、loader 预热、staticData 和权限上下文转发。
// 具体页面交互放到 modules/admin/users，避免 TanStack Router 文件变成大组件。
const booleanSearchParam = z
  .preprocess((value) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false' || value === undefined || value === '') return false;
    return value;
  }, z.boolean())
  .optional()
  .catch(false);

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(50).catch(10),
  status: z.enum(['all', 'active', 'disabled', 'unactivated', 'left']).catch('all'),
  deptId: z.string().optional(),
  directOnly: booleanSearchParam,
  keyword: z.string().catch(''),
});

export const Route = createFileRoute('/_auth/admin/users')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  // 部门树和成员列表都进 Query 缓存；点击部门只改变 search，从而只刷新内容区的数据状态。
  loader: ({ context, deps }) =>
    Promise.all([
      context.queryClient.ensureQueryData(deptsQuery),
      context.queryClient.ensureQueryData(usersQuery(deps)),
    ]),
  staticData: {
    labelKey: 'users.title',
    permission: 'iam:user:view',
    groupKey: 'users.breadcrumbGroup',
    actions: [
      { code: 'iam:user:create', labelKey: 'users.actions.create' },
      { code: 'iam:user:update', labelKey: 'users.actions.edit' },
      { code: 'iam:user:del', labelKey: 'users.actions.delete' },
      { code: 'iam:user:resign', labelKey: 'users.actions.resign' },
      { code: 'iam:dept:create', labelKey: 'users.actions.createDept' },
    ],
  },
  component: UsersRoute,
});

function UsersRoute() {
  const search: UsersSearch = Route.useSearch();
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();

  const handleSearchChange = (patch: Partial<UsersQueryParams>) => {
    const next = { ...search, ...patch, keyword: patch.keyword ?? search.keyword };
    if (!next.deptId) {
      delete next.deptId;
      delete next.directOnly;
    }
    if (!next.directOnly) delete next.directOnly;
    void navigate({ search: next });
  };

  return (
    <UsersPage
      permissions={me.permissions}
      search={search}
      onSearchChange={handleSearchChange}
    />
  );
}
