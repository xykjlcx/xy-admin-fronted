import { menuApi, menusQuery, subsystemsQuery } from '@/modules/admin/api/menu.api';

test('menu queryOptions use stable nav query keys', () => {
  expect(subsystemsQuery.queryKey).toEqual(['nav', 'subsystems']);
  expect(menusQuery('admin').queryKey).toEqual(['nav', 'menus', 'admin']);
});

test('menu api exposes write operations required by the menu management page', () => {
  expect(typeof menuApi.createMenu).toBe('function');
  expect(typeof menuApi.updateMenu).toBe('function');
  expect(typeof menuApi.deleteMenu).toBe('function');
  expect(typeof menuApi.setMenuVisibility).toBe('function');
});
