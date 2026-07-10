import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import i18n from 'i18next';
import { toast } from 'sonner';
import { routeTree } from '@/routeTree.gen';
import { Providers } from './providers';
import { RouteError } from './RouteError';
import { queryClient } from './query';
import { authEvents } from '@/lib/http/events';
import { sessionCredentialService } from '@/lib/session-credential-service';
import { i18nInit } from '@/lib/i18n';
import { assertMenuPathsValid } from '@/modules/registry';
import { appConfig, featuresConfig } from '@/config';
import { env } from '@/config/env';
import { buildInternalRedirect, createHostHistory } from './host-routing';
import '@/styles/global.css';

// mount.tsx 是浏览器端应用装配层：路由、QueryClient、Provider、i18n 和全局事件都在这里接线。
// 页面组件不应自己处理这些基础设施，否则会破坏 Shell 稳定性和请求缓存一致性。
export const router = createRouter({
  routeTree,
  history: createHostHistory(env.runtime),
  context: { queryClient },
  defaultPreload: 'intent',
  // 全局错误兜底：无此项时渲染期错误的 CatchBoundary 退化为 SafeFragment，错误冒泡到 React 根导致白屏（诊断 F2）。
  defaultErrorComponent: RouteError,
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// dev 菜单漂移校验：种子已由 RoutePath 编译期收窄，此处防未来运行时（DB）菜单指向不存在路由。
// 必须在 createRouter 之后跑——fullPath 由路由树初始化时计算，此时 routesByPath 才完整。
if (featuresConfig.isDev) assertMenuPathsValid(Object.keys(router.routesByPath));

// 401 统一处理：先导航回登录、再清缓存（事件解耦，spec §9；http 层不感知路由）。
// 顺序很关键：clear 会让 _auth 里挂载中的 useSuspenseQuery 用空 token 立即重拉，
// 所以必须等导航离开受保护树后再清理 SessionCredentialService。
// 退订接 HMR dispose，防开发期 mount 模块反复求值导致订阅堆积。
const offAuthExpired = authEvents.on('expired', () => {
  // 已在登录页时忽略：登出/过期后残留请求可能带空 token 再触发 401，
  // 不能再 navigate 或覆写 redirect（否则 redirect 会指向 /login 自身）。
  if (router.state.location.pathname === appConfig.routes.login) return;
  // 先捕获来源路径：导航后 window.location 会变成 /login，redirect 必须用导航前的值。
  const redirect = buildInternalRedirect(router.state.location);
  void (async () => {
    await router.navigate({ to: appConfig.routes.login, search: { redirect } });
    try {
      await sessionCredentialService.clear('expired');
    } catch {
      toast.error(i18n.t('shell.toast.sessionClearFailed'));
    }
  })();
});
import.meta.hot?.dispose(offAuthExpired);

export async function mountApp() {
  await i18nInit; // 与 MSW 启动同级纪律：i18n ready 前不 mount，防首屏 key 闪现
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </StrictMode>,
  );
}
