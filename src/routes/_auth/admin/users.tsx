import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { UsersView } from '@/modules/admin/components/users/UsersView';
import {
  deptsQuery,
  userApi,
  usersQuery,
  type PageResult,
  type UpdateUserInput,
  type UserDto,
  type UsersQueryParams,
} from '@/modules/admin/api/user.api';

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
  component: UsersPage,
});

type UsersSearch = UsersQueryParams & { keyword: string };
const emptyUsersPage: PageResult<UserDto> = { list: [], total: 0 };

function UsersPage() {
  const search = Route.useSearch() as UsersSearch;
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: depts } = useSuspenseQuery(deptsQuery);
  const usersResult = useQuery(usersQuery(search));
  const usersPage = usersResult.data ?? emptyUsersPage;
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['iam', 'users'] });
  const createUser = useMutation({ mutationFn: userApi.createUser, onSuccess: invalidateUsers });
  const updateUser = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserInput }) => userApi.updateUser(id, dto),
    onSuccess: invalidateUsers,
  });
  const deleteUser = useMutation({ mutationFn: userApi.deleteUser, onSuccess: invalidateUsers });
  const batchDisable = useMutation({ mutationFn: userApi.batchDisableUsers, onSuccess: invalidateUsers });

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
    <UsersView
      permissions={me.permissions}
      depts={depts}
      usersPage={usersPage}
      usersLoading={usersResult.isPending}
      usersRefreshing={usersResult.isFetching && !usersResult.isPending}
      search={search}
      onSearchChange={handleSearchChange}
      onCreateUser={async (dto) => {
        await createUser.mutateAsync(dto);
      }}
      onUpdateUser={async (id, dto) => {
        await updateUser.mutateAsync({ id, dto });
      }}
      onDeleteUser={async (id) => {
        await deleteUser.mutateAsync(id);
      }}
      onBatchDisable={async (ids) => {
        await batchDisable.mutateAsync(ids);
      }}
    />
  );
}
