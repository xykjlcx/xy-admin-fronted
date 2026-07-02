import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { meQuery } from '@/modules/admin/api/auth.api';
import { useAuth } from '@/stores/auth';
import { matchPermission } from '@/lib/permission';

// 鉴权布局：beforeLoad 确保 token + 预取 me + 页面级权限守卫；Shell 在 Task 11/12 接入（component 换 <Shell>）
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location, matches }) => {
    if (!useAuth.getState().token)
      throw redirect({ to: '/login', search: { redirect: location.href } });
    const me = await context.queryClient.ensureQueryData(meQuery);
    // 页面级守卫：取目标叶子路由 staticData.permission 校验（只 throw，禁 toast——preload=intent hover 即触发）
    const need = matches[matches.length - 1]?.staticData?.permission;
    if (need && !matchPermission(me.permissions, need)) throw redirect({ to: '/403' });
    return { me }; // 子路由经 context 拿 me（含 permissions）
  },
  component: () => <Outlet />,
});
