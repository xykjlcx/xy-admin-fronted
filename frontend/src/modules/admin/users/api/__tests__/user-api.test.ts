import { readFileSync } from 'node:fs';
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserDetailSchema,
  deptKeys,
  deptsQuery,
  userDetailQuery,
  userKeys,
  usersQuery,
  useUserMutations,
  type UserDto,
  type UsersQueryParams,
} from '@/modules/admin/users/api';

const params: UsersQueryParams = { page: 1, pageSize: 10, status: 'all', keyword: '' };

const userRow: UserDto = {
  id: 'u1',
  name: '李长昕',
  deptId: 'rd',
  role: '超级管理员',
  phone: '+86 158 0611 9676',
  email: 'lichangxin@example.com',
  status: 'active',
  joinedAt: '2026-07-01',
};

test('users api exposes schema-derived input contracts', () => {
  expect(CreateUserSchema.safeParse({
    name: '测试成员',
    deptId: 'rd',
    role: '开发工程师',
    phone: '13800000000',
    email: 'test@example.com',
  }).success).toBe(true);
  expect(CreateUserSchema.safeParse({ ...userRow, email: 'bad-email' }).success).toBe(false);
  expect(UpdateUserSchema.safeParse({ status: 'disabled' }).success).toBe(true);
  expect(UserDetailSchema.parse(userRow)).toEqual(userRow);
});

test('users api query options use key factories and staleTime tiers', () => {
  expect(userKeys.all).toEqual(['iam', 'users']);
  expect(userKeys.list(params)).toEqual(['iam', 'users', 'list', params]);
  expect(userKeys.detail('u1')).toEqual(['iam', 'users', 'detail', 'u1']);
  expect(deptKeys.all).toEqual(['iam', 'depts']);

  const listOptions = usersQuery(params);
  expect(listOptions.queryKey).toEqual(userKeys.list(params));
  expect(listOptions.staleTime).toBeUndefined();
  expect(typeof listOptions.placeholderData).toBe('function');

  const detailOptions = userDetailQuery('u1');
  expect(detailOptions.queryKey).toEqual(userKeys.detail('u1'));
  expect(detailOptions.staleTime).toBeUndefined();

  expect(deptsQuery.queryKey).toEqual(deptKeys.all);
  expect(deptsQuery.staleTime).toBe(5 * 60 * 1000);
});

test('users mutations are centralized and invalidate user/dept key factories', () => {
  const source = readFileSync('src/modules/admin/users/api/user.ts', 'utf8');

  expect(typeof useUserMutations).toBe('function');
  expect(source).toContain('useQueryClient');
  expect(source).toContain('useMutation');
  expect(source).toContain('userKeys.all');
  expect(source).toContain('deptKeys.all');
  expect(source).not.toMatch(/\['iam',\s*'users'/);
  expect(source).not.toMatch(/\['iam',\s*'depts'/);
});
