import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import { Providers } from './providers';
import { RouteError } from './RouteError';
import { queryClient } from './query';
import { authEvents } from '@/lib/http/events';
import { resetAuth } from '@/lib/reset-auth';
import { i18nInit } from '@/lib/i18n';
import { assertMenuPathsValid } from '@/modules/registry';
import { appConfig, featuresConfig } from '@/config';
import '@/styles/global.css';

// mount.tsx 是浏览器端应用装配层：路由、QueryClient、Provider、i18n 和全局事件都在这里接线。
// 页面组件不应自己处理这些基础设施，否则会破坏 Shell 稳定性和请求缓存一致性。
export const router = createRouter({
  routeTree,
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

// 401 统一处理：清 token + auth 缓存 → 回登录（事件解耦，spec §9；http 层不感知路由）。
// 退订接 HMR dispose，防开发期 mount 模块反复求值导致订阅堆积。logout 接线在 Task 11，同用 resetAuth。
const offAuthExpired = authEvents.on('expired', () => {
  resetAuth(null);
  void router.navigate({
    to: appConfig.routes.login,
    search: { redirect: location.pathname + location.search },
  });
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
