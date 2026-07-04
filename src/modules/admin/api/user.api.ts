import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/lib/http/client';
import { defineApiContract, pageResultSchema } from '@/lib/http/contract';

// 成员管理接口在这里集中定义 shape、queryKey 和 mutation 入口。
// 页面组件只处理交互状态，接口返回结构变化时由 zod 契约先拦住。
export interface PageResult<T> {
  list: T[];
  total: number;
}

const UserStatusSchema = z.enum(['active', 'disabled', 'unactivated', 'left']);
const DeptSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  sort: z.number(),
  memberCount: z.number(),
});
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  deptId: z.string(),
  role: z.string(),
  phone: z.string(),
  email: z.string(),
  status: UserStatusSchema,
  joinedAt: z.string(),
});
const UsersPageSchema = pageResultSchema(UserSchema);
const BatchDisableResultSchema = z.object({ updated: z.number() });
const NullSchema = z.null();

const deptsContract = defineApiContract({ response: z.array(DeptSchema) });
const usersContract = defineApiContract({ response: UsersPageSchema });
const userContract = defineApiContract({ response: UserSchema });
const batchDisableContract = defineApiContract({ response: BatchDisableResultSchema });
const nullContract = defineApiContract({ response: NullSchema });

export type DeptDto = z.infer<typeof DeptSchema>;
export type UserDto = z.infer<typeof UserSchema>;

export interface UsersQueryParams {
  page: number;
  pageSize: number;
  status: 'all' | UserDto['status'];
  deptId?: string;
  directOnly?: boolean;
  keyword?: string;
}

export interface CreateUserInput {
  name: string;
  deptId: string;
  role: string;
  phone: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  deptId?: string;
  role?: string;
  phone?: string;
  email?: string;
  status?: UserDto['status'];
}

export const deptsQuery = queryOptions({
  queryKey: ['iam', 'depts'],
  queryFn: () => http.get('/api/depts', undefined, deptsContract),
});

export const usersQuery = (params: UsersQueryParams) =>
  queryOptions({
    queryKey: ['iam', 'users', params],
    queryFn: () => http.get('/api/users', { ...params }, usersContract),
    placeholderData: keepPreviousData,
  });

export const userApi = {
  createUser: (dto: CreateUserInput) => http.post('/api/users', dto, userContract),
  updateUser: (id: string, dto: UpdateUserInput) => http.put(`/api/users/${id}`, dto, userContract),
  deleteUser: (id: string) => http.del(`/api/users/${id}`, nullContract),
  batchDisableUsers: (ids: string[]) =>
    http.post('/api/users/batch-disable', { ids }, batchDisableContract),
};
