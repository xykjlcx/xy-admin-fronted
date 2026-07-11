import { matchPermission } from '@/lib/permission';

test.each([
  [['*:*:*'], 'iam:user:create', true], // RuoYi 超管
  [['iam:*'], 'iam:user:del', true], // 末段 * 通配其后全部段
  [['iam:user:view'], 'iam:user:view', true],
  [['iam:user:view'], 'iam:user:del', false],
  [[], 'iam:user:view', false],
  // 中段 * 只通配恰好一段，不越权到末段其他动作（回归：iam:*:view 曾误放行 delete）
  [['iam:*:view'], 'iam:user:delete', false],
  [['iam:*:view'], 'iam:user:view', true],
  [['iam:*'], 'iam:user:view', true],
  [['*:*:*'], 'dept:role:whatever', true],
  [['iam:user'], 'iam:user:view', false], // pattern 比 required 短且末段非 * → 不匹配
  [['iam:user:view:extra'], 'iam:user:view', false], // pattern 比 required 长且末段非 * → 不匹配
  [['*:*:*'], 'dashboard:overview:view', true],
])('%j 匹配 %s → %s', (owned, need, expected) => {
  expect(matchPermission({ permissions: owned as string[], systemAdmin: false }, need as string)).toBe(expected);
});

test('system administrator bypasses presentation gates without forging catalog permission codes', () => {
  expect(matchPermission({ permissions: ['iam:user:view'], systemAdmin: true }, 'iam:user:create')).toBe(true);
  expect(matchPermission({ permissions: ['iam:user:view'], systemAdmin: false }, 'iam:user:create')).toBe(false);
});
