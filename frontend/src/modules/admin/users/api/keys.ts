import type { UsersQueryParams } from './schema';

export const userKeys = {
  all: ['iam', 'users'] as const,
  list: (p: UsersQueryParams) => [...userKeys.all, 'list', p] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export const deptKeys = {
  all: ['iam', 'depts'] as const,
};
