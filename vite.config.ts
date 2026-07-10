import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'node:path';
import { existsSync, rmSync } from 'node:fs';

function stripMockWorkerPlugin(mode: string) {
  return {
    name: 'strip-mock-worker',
    closeBundle() {
      if (mode === 'demo') return;
      const workerPath = path.resolve(__dirname, 'dist/mockServiceWorker.js');
      if (existsSync(workerPath)) rmSync(workerPath);
    },
  };
}

// 构建期防呆：非 demo 的生产构建绝不允许开 mock。
// 否则 shouldStartMockWorker 会拉起 mocks 动态导入，MSW/faker 被打进生产包（实测 ~920KB chunk），
// 而 stripMockWorkerPlugin 又会删掉 dist/mockServiceWorker.js → 运行时进入 mock-startup-failed 死局。
// 只在 command === 'build' 时校验：dev serve 与 demo 构建下 VITE_ENABLE_MOCK=true 都是合法场景。
function assertMockDisabledInProdBuild(mode: string) {
  const rawEnv = loadEnv(mode, __dirname, 'VITE_');
  if (rawEnv.VITE_ENABLE_MOCK === 'true') {
    throw new Error(
      '生产构建不允许 VITE_ENABLE_MOCK=true（会把 MSW/faker 打进生产包）。' +
        'demo 构建请改用 `vite build --mode demo`（或 `pnpm build:demo`）。',
    );
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode !== 'demo') assertMockDisabledInProdBuild(mode);

  return {
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      stripMockWorkerPlugin(mode),
    ],
    resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test-setup.ts',
    },
  };
});
