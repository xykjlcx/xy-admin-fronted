import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { meQuery } from '@/modules/admin/api/auth.api';
import { subsystemsQuery, menusQuery } from '@/modules/admin/api/menu.api';
import { useAuth } from '@/stores/auth';
import { matchPermission } from '@/lib/permission';
import { subsystemKeyFromPath } from '@/app/shell/subsystem-key';
import { Shell } from '@/app/shell/Shell';
import { appConfig } from '@/config';

// _auth 是登录后的稳定布局边界：Header/Sidebar/Shell 挂在这里，子路由只替换内容区。
// beforeLoad 确保 token + 预取 me/导航数据 + 页面级权限守卫；component 用 Shell 包裹 Outlet。
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location, matches }) => {
    if (!useAuth.getState().token)
      throw redirect({ to: appConfig.routes.login, search: { redirect: location.pathname + location.searchStr } });
    const me = await context.queryClient.ensureQueryData(meQuery);
    // 页面级守卫：取目标叶子路由 staticData.permission 校验（只 throw，禁 toast——preload=intent hover 即触发）
    const need = matches[matches.length - 1]?.staticData?.permission;
    if (need && !matchPermission(me.permissions, need)) throw redirect({ to: appConfig.routes.forbidden });
    // Shell 用 useSuspenseQuery 取导航数据——此处预取进缓存，渲染时同步命中不触发 Suspense（无首屏闪烁）
    const subsystemKey = subsystemKeyFromPath(location.pathname);
    await Promise.all([
      context.queryClient.ensureQueryData(subsystemsQuery),
      context.queryClient.ensureQueryData(menusQuery(subsystemKey)),
    ]);
    return { me }; // 子路由经 context 拿 me（含 permissions）
  },
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
});
