import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '@/lib/http/client';
import { defineApiContract } from '@/lib/http/contract';
import {
  BatchDisableResultSchema,
  CreateUserSchema,
  NullSchema,
  UpdateUserSchema,
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
const nullContract = defineApiContract({ response: NullSchema });

export const usersQuery = (params: UsersQueryParams) =>
  queryOptions({
    queryKey: userKeys.list(params),
    queryFn: () => http.get('/api/users', { ...params }, usersContract),
    placeholderData: keepPreviousData,
  });

export const userDetailQuery = (id: string) =>
  queryOptions({
    queryKey: userKeys.detail(id),
    queryFn: () => http.get(`/api/users/${id}`, undefined, userDetailContract),
  });

export const userApi = {
  createUser: (dto: CreateUserInput) => http.post('/api/users', CreateUserSchema.parse(dto), userContract),
  updateUser: (id: string, dto: UpdateUserInput) =>
    http.put(`/api/users/${id}`, UpdateUserSchema.parse(dto), userContract),
  deleteUser: (id: string) => http.del(`/api/users/${id}`, nullContract),
  batchDisableUsers: (ids: string[]) =>
    http.post('/api/users/batch-disable', { ids }, batchDisableContract),
};

export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: userKeys.all }),
      qc.invalidateQueries({ queryKey: deptKeys.all }),
    ]);
  const createUser = useMutation({ mutationFn: userApi.createUser, onSuccess: invalidate });
  const updateUser = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserInput }) => userApi.updateUser(id, dto),
    onSuccess: invalidate,
  });
  const deleteUser = useMutation({ mutationFn: userApi.deleteUser, onSuccess: invalidate });
  const batchDisable = useMutation({ mutationFn: userApi.batchDisableUsers, onSuccess: invalidate });
  return { createUser, updateUser, deleteUser, batchDisable };
}
