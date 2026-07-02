import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { meQuery } from '@/modules/admin/api/auth.api';
import { subsystemsQuery, menusQuery } from '@/modules/admin/api/menu.api';
import { useAuth } from '@/stores/auth';
import { matchPermission } from '@/lib/permission';
import { subsystemKeyFromPath } from '@/app/shell/subsystem-key';
import { Shell } from '@/app/shell/Shell';

// 鉴权布局：beforeLoad 确保 token + 预取 me/导航数据 + 页面级权限守卫；component 用 Shell 包裹 Outlet
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location, matches }) => {
    if (!useAuth.getState().token)
      throw redirect({ to: '/login', search: { redirect: location.href } });
    const me = await context.queryClient.ensureQueryData(meQuery);
    // 页面级守卫：取目标叶子路由 staticData.permission 校验（只 throw，禁 toast——preload=intent hover 即触发）
    const need = matches[matches.length - 1]?.staticData?.permission;
    if (need && !matchPermission(me.permissions, need)) throw redirect({ to: '/403' });
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
