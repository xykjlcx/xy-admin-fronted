import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { meQuery } from '@/modules/admin/api/auth.api';
import { useAuth } from '@/stores/auth';

// 鉴权布局：beforeLoad 确保 token + 预取 me；Shell 在 Task 11/12 接入（component 换 <Shell>）
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    if (!useAuth.getState().token)
      throw redirect({ to: '/login', search: { redirect: location.href } });
    const me = await context.queryClient.ensureQueryData(meQuery);
    return { me }; // 子路由经 context 拿 me（含 permissions）
  },
  component: () => <Outlet />,
});
