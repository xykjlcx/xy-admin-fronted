async function bootstrap() {
  const shouldEnableMock =
    import.meta.env.VITE_ENABLE_MOCK === 'true' ||
    import.meta.env.MODE === 'demo' ||
    (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK !== 'false');

  if (shouldEnableMock) {
    try {
      // dynamic import：生产环境静态判断为 false 分支，Vite DCE 剥离本模块及其依赖（msw/faker/mock db）
      const { enableMocking } = await import('./mocks/browser')
      await enableMocking()
    } catch (err) {
      // demo 模式下 mock 就是后端，启动失败不静默白屏，也不继续 mount 主应用
      console.error(err)
      const root = document.getElementById('root')!
      root.dataset.error = 'mock-startup-failed'
      root.textContent = 'Mock startup failed. Check console.'
      return
    }
  }
  // 路由/Provider/i18n 装配抽到 app/mount（含 mount 前 await i18nInit）
  const { mountApp } = await import('./app/mount')
  await mountApp()
}
void bootstrap()
