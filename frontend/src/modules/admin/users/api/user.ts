import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { meQuery } from '@/modules/admin/auth/api';
import { menuKeys } from '@/modules/admin/menus/api';
import { http } from '@/lib/http/client';
import { defineApiContract, defineVoidContract } from '@/lib/http/contract';
import {
  BatchDisableResultSchema,
  CreateUserSchema,
  MoveUsersSchema,
  UpdateUserSchema,
  UserIdsSchema,
  UserDetailSchema,
  UserSchema,
  UsersPageSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UsersQueryParams,
} from './schema';
import { deptKeys, userKeys } from './keys';

const usersContract = defineApiContract({ response: UsersPageSchema });
const userContract = defineApiContract({ response: UserSchema });
const userDetailContract = defineApiContract({ response: UserDetailSchema });
const batchDisableContract = defineApiContract({ response: BatchDisableResultSchema });
const nullContract = defineVoidContract();

export const usersQuery = (params: UsersQueryParams) =>
  queryOptions({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => http.get('/api/users', { ...params }, usersContract, { signal }),
    placeholderData: keepPreviousData,
  });

export const userDetailQuery = (id: string) =>
  queryOptions({
    queryKey: userKeys.detail(id),
    queryFn: ({ signal }) => http.get(`/api/users/${id}`, undefined, userDetailContract, { signal }),
  });

export const userApi = {
  createUser: (dto: CreateUserInput) => http.post('/api/users', CreateUserSchema.parse(dto), userContract),
  updateUser: (id: string, dto: UpdateUserInput) =>
    http.put(`/api/users/${id}`, UpdateUserSchema.parse(dto), userContract),
  deleteUser: (id: string) => http.del(`/api/users/${id}`, nullContract),
  batchDisableUsers: (ids: string[]) =>
    http.post('/api/users/batch-disable', UserIdsSchema.parse({ ids }), batchDisableContract),
  batchEnableUsers: (ids: string[]) =>
    http.post('/api/users/batch-enable', UserIdsSchema.parse({ ids }), batchDisableContract),
  batchMoveUsers: (ids: string[], deptId: string) =>
    http.post('/api/users/batch-move', MoveUsersSchema.parse({ ids, deptId }), batchDisableContract),
};

export function useUserMutations() {
  const qc = useQueryClient();
  const router = useRouter({ warn: false });
  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: userKeys.all }),
      qc.invalidateQueries({ queryKey: deptKeys.all }),
      qc.invalidateQueries({ queryKey: meQuery.queryKey }),
      qc.invalidateQueries({ queryKey: menuKeys.menuLists() }),
    ]);
    await router?.invalidate();
  };
  const createUser = useMutation({ mutationFn: userApi.createUser, onSuccess: invalidate });
  const updateUser = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserInput }) => userApi.updateUser(id, dto),
    onSuccess: invalidate,
  });
  const deleteUser = useMutation({ mutationFn: userApi.deleteUser, onSuccess: invalidate });
  const batchDisable = useMutation({ mutationFn: userApi.batchDisableUsers, onSuccess: invalidate });
  const batchEnable = useMutation({ mutationFn: userApi.batchEnableUsers, onSuccess: invalidate });
  const batchMove = useMutation({
    mutationFn: ({ ids, deptId }: { ids: string[]; deptId: string }) =>
      userApi.batchMoveUsers(ids, deptId),
    onSuccess: invalidate,
  });
  return { createUser, updateUser, deleteUser, batchDisable, batchEnable, batchMove };
}
