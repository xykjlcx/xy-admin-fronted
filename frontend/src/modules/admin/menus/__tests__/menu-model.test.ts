import { buildManagedMenuRows, menuRouteOptions } from '@/modules/admin/menus/model';
import type { MenuRecord } from '@/modules/types';

const menus: MenuRecord[] = [
  {
    id: 'dir',
    parentId: null,
    subsystemKey: 'admin',
    type: 'dir',
    label: { 'zh-CN': '系统管理' },
    visible: true,
    sort: 1,
  },
  {
    id: 'page',
    parentId: 'dir',
    subsystemKey: 'admin',
    type: 'menu',
    label: { 'zh-CN': '菜单管理' },
    path: '/admin/menus',
    visible: true,
    sort: 1,
  },
  {
    id: 'action',
    parentId: 'page',
    subsystemKey: 'admin',
    type: 'action',
    label: { 'zh-CN': '新增菜单' },
    permission: 'iam:menu:create',
    visible: true,
    sort: 1,
  },
];

test('registered route options cover routes declared by every subsystem manifest', () => {
  const values = menuRouteOptions.map((option) => option.value);

  expect(values).toContain('/admin/menus');
  expect(values).toContain('/lastmile/overview');
  expect(new Set(values).size).toBe(values.length);
});

test('managed rows own the navigation-only rule instead of leaking action cases to the tree', () => {
  const rows = buildManagedMenuRows(menus, [], 'zh-CN', '');

  expect(rows.map((row) => row.menu.id)).toEqual(['dir', 'page']);
});

test('search reveals a matching descendant even when its parent was collapsed', () => {
  const rows = buildManagedMenuRows(menus, ['dir'], 'zh-CN', '菜单管理');

  expect(rows.find((row) => row.menu.id === 'page')?.hiddenByCollapse).toBe(false);
});
