import {
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
  expect(typeof menuApi.createSubsystem).toBe('function');
  expect(typeof menuApi.updateMenu).toBe('function');
  expect(typeof menuApi.updateSubsystem).toBe('function');
  expect(typeof menuApi.deleteMenu).toBe('function');
  expect(typeof menuApi.setMenuVisibility).toBe('function');
});

test('menu write schema rejects node shapes that violate the type contract', () => {
  expect(
    UpdateMenuSchema.safeParse({
      type: 'dir',
      parentId: 'm-parent',
      label: { 'zh-CN': '目录' },
      visible: true,
      sort: 1,
    }).success,
  ).toBe(false);

  expect(
    UpdateMenuSchema.safeParse({
      type: 'action',
      parentId: null,
      label: { 'zh-CN': '导出' },
      visible: true,
      sort: 1,
    }).success,
  ).toBe(false);
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
