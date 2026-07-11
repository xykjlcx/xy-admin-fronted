import {
  MenuCustomizationSchema,
  RuntimeMenuCreateSchema,
  CreateSubsystemSchema,
  RoutePathSchema,
  UpdateMenuSchema,
  menuApi,
  menusQuery,
  subsystemsQuery,
} from '@/modules/admin/menus/api';

test('menu queryOptions use stable nav query keys', () => {
  expect(subsystemsQuery.queryKey).toEqual(['nav', 'subsystems']);
  expect(menusQuery('admin').queryKey).toEqual(['nav', 'menus', 'admin']);
  expect(menusQuery('admin').staleTime).toBeUndefined();
});

test('menu api exposes write operations required by the menu management page', () => {
  expect(typeof menuApi.createMenu).toBe('function');
  expect(typeof menuApi.updateMenu).toBe('function');
  expect(typeof menuApi.deleteMenu).toBe('function');
  expect(typeof menuApi.setMenuVisibility).toBe('function');
  expect(menuApi).not.toHaveProperty('createSubsystem');
  expect(menuApi).not.toHaveProperty('updateSubsystem');
});

test('menu write schema rejects node shapes that violate the type contract', () => {
  expect(
    UpdateMenuSchema.safeParse({
      type: 'dir',
      parentId: 'm-parent',
      label: { 'zh-CN': '目录' },
      visible: true,
      sort: 1,
      path: '/catalog-owned',
    }).success,
  ).toBe(false);

  expect(
    UpdateMenuSchema.safeParse({
      type: 'action',
      parentId: null,
      label: { 'zh-CN': '导出' },
      visible: true,
      sort: 1,
      permission: 'iam:user:export',
    }).success,
  ).toBe(false);
});

test('catalog menus keep code-owned fields read-only while runtime creation is directory-only', () => {
  expect(
    MenuCustomizationSchema.safeParse({
      type: 'menu',
      parentId: null,
      label: { 'zh-CN': '用户管理' },
      icon: 'users',
      visible: true,
      sort: 10,
      path: '/changed-by-client',
      permission: 'iam:changed',
    }).success,
  ).toBe(false);
  expect(
    RuntimeMenuCreateSchema.safeParse({
      subsystemKey: 'admin',
      type: 'menu',
      parentId: null,
      label: { 'zh-CN': '伪造页面' },
      path: '/admin/users',
      visible: true,
      sort: 1,
    }).success,
  ).toBe(false);
  expect(
    RuntimeMenuCreateSchema.safeParse({
      subsystemKey: 'admin',
      type: 'dir',
      parentId: null,
      label: { 'zh-CN': '运行时目录' },
      visible: true,
      sort: 1,
    }).success,
  ).toBe(true);
});

test('route and subsystem schemas reject values that cannot be registered', () => {
  expect(RoutePathSchema.safeParse('admin/users').success).toBe(false);
  expect(
    CreateSubsystemSchema.safeParse({
      key: 'Warehouse_APP',
      label: { 'zh-CN': '仓储' },
      desc: { 'zh-CN': '仓储系统' },
      icon: 'folder',
      color: 'var(--accent-emphasis)',
      home: 'admin/users',
      builtin: false,
      enabled: true,
      sort: 1,
    }).success,
  ).toBe(false);
});
