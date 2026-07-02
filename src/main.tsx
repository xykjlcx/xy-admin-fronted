import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCK === 'true') {
    // dynamic import：生产环境静态判断为 false 分支，Vite DCE 剥离本模块及其依赖（msw/faker/mock db）
    const { enableMocking } = await import('./mocks/browser')
    await enableMocking()
  }
  // Task 8 抽成 app/mount
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
void bootstrap()
