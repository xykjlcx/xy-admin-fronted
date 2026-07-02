import { matchPermission } from '@/lib/permission';

test.each([
  [['*:*:*'], 'iam:user:create', true], // RuoYi 超管
  [['iam:*'], 'iam:user:del', true], // 段通配
  [['iam:user:view'], 'iam:user:view', true],
  [['iam:user:view'], 'iam:user:del', false],
  [[], 'iam:user:view', false],
])('%j 匹配 %s → %s', (owned, need, expected) => {
  expect(matchPermission(owned as string[], need as string)).toBe(expected);
});
