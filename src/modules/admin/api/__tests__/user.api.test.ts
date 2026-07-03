import { usersQuery, type PageResult, type UserDto } from '@/modules/admin/api/user.api';

const params = { page: 1, pageSize: 10, status: 'all', keyword: '' } as const;

test('usersQuery 在筛选分页 queryKey 变化时保留上一份成员数据', () => {
  const options = usersQuery(params);
  const previous: PageResult<UserDto> = {
    list: [
      {
        id: 'u-1',
        name: '李长昕',
        deptId: 'rd',
        role: '超级管理员',
        phone: '+86 158 0611 9676',
        email: 'lichangxin@example.com',
        status: 'active',
        joinedAt: '2026-07-01',
      },
    ],
    total: 1,
  };

  expect(typeof options.placeholderData).toBe('function');
  const placeholderData = options.placeholderData as (previousData: PageResult<UserDto>) => PageResult<UserDto>;
  expect(placeholderData(previous)).toBe(previous);
});
