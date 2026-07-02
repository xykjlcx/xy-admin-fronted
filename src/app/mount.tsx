import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from '@/routeTree.gen';
import { Providers } from './providers';
import { queryClient } from './query';
import { authEvents } from '@/lib/http/events';
import { useAuth } from '@/stores/auth';
import { i18nInit } from '@/lib/i18n';
import { manifests } from '@/modules/registry';
import '@/styles/global.css';

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

// dev 菜单漂移校验：种子已由 RoutePath 编译期收窄，此处防未来运行时（DB）菜单指向不存在路由。
// 必须在 createRouter 之后跑——fullPath 由路由树初始化时计算，此时 routesByPath 才完整。
if (import.meta.env.DEV) {
  const valid = new Set(Object.keys(router.routesByPath));
  for (const m of manifests)
    for (const rec of m.menuSeed)
      if (rec.path && !valid.has(rec.path))
        console.error(`[menu-drift] 菜单 ${rec.id} 指向不存在路由: ${rec.path}`);
}

// 401 统一处理：清 token → 失效 me 缓存 → 回登录（事件解耦，spec §9；http 层不感知路由）
authEvents.on('expired', () => {
  useAuth.getState().setToken(null);
  queryClient.removeQueries({ queryKey: ['auth'] });
  void router.navigate({ to: '/login', search: { redirect: location.pathname } });
});

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
