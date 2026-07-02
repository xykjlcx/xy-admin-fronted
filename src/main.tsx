import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCK === 'true') {
    try {
      // dynamic import：生产环境静态判断为 false 分支，Vite DCE 剥离本模块及其依赖（msw/faker/mock db）
      const { enableMocking } = await import('./mocks/browser')
      await enableMocking()
    } catch (err) {
      // demo 模式下 mock 就是后端，启动失败不静默白屏，也不继续 mount 主应用
      console.error(err)
      document.getElementById('root')!.innerHTML = 'Mock 服务启动失败，请检查控制台'
      return
    }
  }
  // Task 8 抽成 app/mount
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
void bootstrap()
