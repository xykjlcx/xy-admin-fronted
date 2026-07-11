import {
  parseUserFilters,
  stringifyUserFilters,
  userMatchesAdvancedFilters,
  type UserFilterCondition,
} from '@/modules/admin/users/model';
import type { UserDto } from '@/modules/admin/users/api';

const user: UserDto = {
  id: 'u-test',
  name: '张三',
  deptId: 'rd',
  role: '开发工程师',
  phone: '+86 138 0000 0000',
  email: 'zhangsan@example.com',
  status: 'active',
  joinedAt: '2026-07-01',
};

test('user filter model serializes and parses valid filter conditions', () => {
  const filters: UserFilterCondition[] = [
    { id: 'f1', field: 'name', operator: 'contains', value: '张' },
    { id: 'f2', field: 'status', operator: 'eq', value: 'active' },
  ];

  expect(parseUserFilters(stringifyUserFilters(filters))).toEqual(filters);
  expect(parseUserFilters('not-json')).toEqual([]);
});

test('user filter model preserves empty draft conditions for editing', () => {
  const filters: UserFilterCondition[] = [
    { id: 'f1', field: 'name', operator: 'contains', value: '' },
  ];

  expect(parseUserFilters(stringifyUserFilters(filters))).toEqual(filters);
  expect(userMatchesAdvancedFilters(user, filters)).toBe(true);
});

test('user filter model matches text and select conditions', () => {
  expect(
    userMatchesAdvancedFilters(user, [
      { id: 'f1', field: 'name', operator: 'contains', value: '张' },
      { id: 'f2', field: 'phone', operator: 'contains', value: '138' },
      { id: 'f3', field: 'status', operator: 'eq', value: 'active' },
    ]),
  ).toBe(true);

  expect(
    userMatchesAdvancedFilters(user, [
      { id: 'f1', field: 'name', operator: 'contains', value: '李' },
    ]),
  ).toBe(false);
});
