import { buildMenuTree } from '@/lib/menu-tree';
import { adminManifest } from '@/modules/admin/manifest';

test('组树 + 权限过滤 + action 不渲染', () => {
  const tree = buildMenuTree(adminManifest.menuSeed, ['dashboard:view']);
  expect(tree).toHaveLength(1); // 只剩"工作台"组（org 组无权限被剪空）
  expect(tree[0]!.children![0]!.path).toBe('/admin/dashboard');
});

test('通配符全量可见', () => {
  expect(buildMenuTree(adminManifest.menuSeed, ['*:*:*'])).toHaveLength(2);
});
