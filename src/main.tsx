import { startMockWorkerIfEnabled } from '@/config';

// 应用入口只做启动编排：先决定 mock 是否接管网络，再懒加载真正的 React 应用装配。
// 这样生产构建能把 MSW/faker 静态剥离，首屏也不会在 mock 未就绪时先发真实请求。
async function bootstrap() {
  try {
    await startMockWorkerIfEnabled();
  } catch (err) {
    // demo 模式下 mock 就是后端，启动失败不静默白屏，也不继续 mount 主应用
    console.error(err)
    const root = document.getElementById('root')!
    root.dataset.error = 'mock-startup-failed'
    root.textContent = 'Mock startup failed. Check console.'
    return
  }

  // 路由/Provider/i18n 装配抽到 app/mount（含 mount 前 await i18nInit）
  const { mountApp } = await import('./app/mount')
  await mountApp()
}
void bootstrap()
