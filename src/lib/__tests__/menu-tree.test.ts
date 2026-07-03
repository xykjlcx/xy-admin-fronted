import { buildMenuTree } from '@/lib/menu-tree';
import { adminManifest } from '@/modules/admin/manifest';
import type { MenuRecord } from '@/modules/types';

test('组树 + 权限过滤 + action 不渲染', () => {
  const tree = buildMenuTree(adminManifest.menuSeed, ['dashboard:view']);
  expect(tree).toHaveLength(1); // 只剩"工作台"组（org 组无权限被剪空）
  expect(tree[0]!.children![0]!.path).toBe('/admin/dashboard');
});

test('通配符全量可见', () => {
  expect(buildMenuTree(adminManifest.menuSeed, ['*:*:*'])).toHaveLength(2);
});

test('角色与权限菜单受 iam:role:view 控制', () => {
  const tree = buildMenuTree(adminManifest.menuSeed, ['iam:user:view', 'iam:role:view']);
  const org = tree.find((node) => node.id === 'm-org');
  expect(org?.children?.map((node) => node.path)).toEqual(['/admin/users', '/admin/roles']);

  const withoutRolePermission = buildMenuTree(adminManifest.menuSeed, ['iam:user:view']);
  const orgWithoutRole = withoutRolePermission.find((node) => node.id === 'm-org');
  expect(orgWithoutRole?.children?.map((node) => node.path)).toEqual(['/admin/users']);
});

test('嵌套空目录自底向上剪枝：叶子无权限 → 多级空目录整支被剪', () => {
  const records: MenuRecord[] = [
    { id: 'A', parentId: null, subsystemKey: 'x', type: 'dir', label: { 'zh-CN': 'A' }, visible: true, sort: 1 },
    { id: 'B', parentId: 'A', subsystemKey: 'x', type: 'dir', label: { 'zh-CN': 'B' }, visible: true, sort: 1 },
    { id: 'C', parentId: 'B', subsystemKey: 'x', type: 'menu', label: { 'zh-CN': 'C' }, permission: 'need:this', visible: true, sort: 1 },
  ];
  expect(buildMenuTree(records, [])).toHaveLength(0);
});
