import { buildMenuTree } from '@/lib/menu-tree';
import { adminManifest } from '@/modules/admin/manifest';
import type { MenuRecord } from '@/modules/types';

test('组树 + 权限过滤 + action 不渲染', () => {
  const tree = buildMenuTree(adminManifest.menuSeed, { permissions: ['dashboard:overview:view'], systemAdmin: false });
  expect(tree).toHaveLength(1); // 只剩"工作台"组（org 组无权限被剪空）
  expect(tree[0]!.children![0]!.path).toBe('/admin/dashboard');
});

test('通配符全量可见', () => {
  expect(buildMenuTree(adminManifest.menuSeed, { permissions: ['*:*:*'], systemAdmin: false }).map((node) => node.id)).toEqual([
    'm-home',
    'm-org',
    'm-audit',
    'm-file-center',
    'm-system',
  ]);
});

test('角色与权限菜单受 iam:role:view 控制', () => {
  const tree = buildMenuTree(adminManifest.menuSeed, { permissions: ['iam:user:view', 'iam:role:view'], systemAdmin: false });
  const org = tree.find((node) => node.id === 'm-org');
  expect(org?.children?.map((node) => node.path)).toEqual(['/admin/users', '/admin/roles']);

  const withoutRolePermission = buildMenuTree(adminManifest.menuSeed, { permissions: ['iam:user:view'], systemAdmin: false });
  const orgWithoutRole = withoutRolePermission.find((node) => node.id === 'm-org');
  expect(orgWithoutRole?.children?.map((node) => node.path)).toEqual(['/admin/users']);
});

test('systemAdmin 无 catalog grant 仍可见后续新增菜单', () => {
  const tree = buildMenuTree(adminManifest.menuSeed, { permissions: [], systemAdmin: true });
  expect(tree.flatMap((node) => node.children ?? []).map((node) => node.path)).toContain('/admin/roles');
});

test('嵌套空目录自底向上剪枝：叶子无权限 → 多级空目录整支被剪', () => {
  const records: MenuRecord[] = [
    { id: 'A', parentId: null, subsystemKey: 'x', type: 'dir', label: { 'zh-CN': 'A' }, visible: true, sort: 1, origin: 'catalog', runtimeManaged: false },
    { id: 'B', parentId: 'A', subsystemKey: 'x', type: 'dir', label: { 'zh-CN': 'B' }, visible: true, sort: 1, origin: 'catalog', runtimeManaged: false },
    { id: 'C', parentId: 'B', subsystemKey: 'x', type: 'menu', label: { 'zh-CN': 'C' }, permission: 'need:this', visible: true, sort: 1, origin: 'catalog', runtimeManaged: false },
  ];
  expect(buildMenuTree(records, { permissions: [], systemAdmin: false })).toHaveLength(0);
});
