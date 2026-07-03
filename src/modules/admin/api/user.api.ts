import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { http } from '@/lib/http/client';

export interface PageResult<T> {
  list: T[];
  total: number;
}

export interface DeptDto {
  id: string;
  parentId: string | null;
  name: string;
  sort: number;
  memberCount: number;
}

export interface UserDto {
  id: string;
  name: string;
  deptId: string;
  role: string;
  phone: string;
  email: string;
  status: 'active' | 'disabled' | 'unactivated' | 'left';
  joinedAt: string;
}

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
  queryFn: () => http.get<DeptDto[]>('/api/depts'),
});

export const usersQuery = (params: UsersQueryParams) =>
  queryOptions({
    queryKey: ['iam', 'users', params],
    queryFn: () => http.get<PageResult<UserDto>>('/api/users', { ...params }),
    placeholderData: keepPreviousData,
  });

export const userApi = {
  createUser: (dto: CreateUserInput) => http.post<UserDto>('/api/users', dto),
  updateUser: (id: string, dto: UpdateUserInput) => http.put<UserDto>(`/api/users/${id}`, dto),
  deleteUser: (id: string) => http.del<null>(`/api/users/${id}`),
  batchDisableUsers: (ids: string[]) =>
    http.post<{ updated: number }>('/api/users/batch-disable', { ids }),
};
