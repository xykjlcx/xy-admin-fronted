import { useMemo, type ReactNode } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import { subsystemsQuery, menusQuery } from '@/modules/admin/api/menu.api';
import { meQuery } from '@/modules/admin/api/auth.api';
import { buildMenuTree } from '@/lib/menu-tree';
import { useAppearance } from '@/stores/appearance';
import { subsystemKeyFromPath } from './subsystem-key';
import { layoutRegistry } from './layouts/registry';

// Shell 容器是登录后的业务稳定层：统一取数（子系统 / 菜单 / me）+ 组树，再按当前 layout 选布局并下发 props（spec §7.3）。
// 只要新页面继续挂在 /_auth 下，路由切换就只替换 children，不会重建整套 Header/Sidebar。
// 部件不感知布局、布局不取数——三层分离。
export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const subsystemKey = subsystemKeyFromPath(pathname);
  const { data: subsystems } = useSuspenseQuery(subsystemsQuery);
  const { data: menus } = useSuspenseQuery(menusQuery(subsystemKey));
  const { data: me } = useSuspenseQuery(meQuery);
  // 菜单过滤只提升体验和防误触，真正的权限边界仍然必须在后端校验。
  const menuTree = useMemo(() => buildMenuTree(menus, me.permissions), [menus, me.permissions]);

  const layout = useAppearance((s) => s.layout);
  const collapsed = useAppearance((s) => s.collapsed[layout] ?? false);
  const setCollapsed = useAppearance((s) => s.setCollapsed);
  const Layout = layoutRegistry[layout] ?? layoutRegistry.sidebar!;

  return (
    <Layout
      menuTree={menuTree}
      subsystems={subsystems}
      collapsed={collapsed}
      onCollapsedChange={(next) => setCollapsed(layout, next)}
    >
      {children}
    </Layout>
  );
}
