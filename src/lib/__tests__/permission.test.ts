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
  [['*:*:*'], 'dashboard:view', true], // 权限串段数不固定：3 段超管 pattern 末段 * 需覆盖 2 段的 dashboard:view
])('%j 匹配 %s → %s', (owned, need, expected) => {
  expect(matchPermission(owned as string[], need as string)).toBe(expected);
});
