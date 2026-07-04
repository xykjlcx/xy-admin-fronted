import { createFileRoute } from '@tanstack/react-router';
import { MenusPage } from '@/modules/admin/pages/menus';

// 菜单管理目前不需要 URL search，路由层只声明权限元数据并把 me.permissions 传给页面。
// 新增筛选/选中态时优先放 search，保持刷新后状态可恢复。
export const Route = createFileRoute('/_auth/admin/menus')({
  staticData: {
    labelKey: 'menus.title',
    permission: 'iam:menu:view',
    groupKey: 'menus.breadcrumbGroup',
    actions: [
      { code: 'iam:menu:create', labelKey: 'menus.actions.create' },
      { code: 'iam:menu:update', labelKey: 'menus.actions.edit' },
      { code: 'iam:menu:del', labelKey: 'menus.actions.delete' },
      { code: 'iam:menu:toggle', labelKey: 'menus.actions.toggleVisible' },
    ],
  },
  component: MenusRoute,
});

function MenusRoute() {
  const { me } = Route.useRouteContext();

  return <MenusPage permissions={me.permissions} />;
}
