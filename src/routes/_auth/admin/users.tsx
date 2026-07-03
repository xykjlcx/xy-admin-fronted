import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { UsersView } from '@/modules/admin/components/users/UsersView';
import {
  deptsQuery,
  userApi,
  usersQuery,
  type UpdateUserInput,
  type UsersQueryParams,
} from '@/modules/admin/api/user.api';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(50).catch(10),
  status: z.enum(['all', 'active', 'disabled', 'unactivated', 'left']).catch('all'),
  deptId: z.string().optional(),
  keyword: z.string().catch(''),
});

export const Route = createFileRoute('/_auth/admin/users')({
  validateSearch: searchSchema,
  staticData: {
    label: '成员与部门',
    permission: 'iam:user:view',
    group: '组织与权限',
    actions: [
      { code: 'iam:user:create', label: '添加成员' },
      { code: 'iam:user:update', label: '编辑成员' },
      { code: 'iam:user:del', label: '删除成员' },
      { code: 'iam:user:resign', label: '办理离职' },
      { code: 'iam:dept:create', label: '新建部门' },
    ],
  },
  component: UsersPage,
});

type UsersSearch = UsersQueryParams & { keyword: string };

function UsersPage() {
  const search = Route.useSearch() as UsersSearch;
  const navigate = Route.useNavigate();
  const { me } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const { data: depts } = useSuspenseQuery(deptsQuery);
  const { data: usersPage } = useSuspenseQuery(usersQuery(search));
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['iam', 'users'] });
  const createUser = useMutation({ mutationFn: userApi.createUser, onSuccess: invalidateUsers });
  const updateUser = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserInput }) => userApi.updateUser(id, dto),
    onSuccess: invalidateUsers,
  });
  const deleteUser = useMutation({ mutationFn: userApi.deleteUser, onSuccess: invalidateUsers });
  const batchDisable = useMutation({ mutationFn: userApi.batchDisableUsers, onSuccess: invalidateUsers });

  const handleSearchChange = (patch: Partial<UsersQueryParams>) => {
    void navigate({ search: { ...search, ...patch, keyword: patch.keyword ?? search.keyword } });
  };

  return (
    <UsersView
      permissions={me.permissions}
      depts={depts}
      usersPage={usersPage}
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
