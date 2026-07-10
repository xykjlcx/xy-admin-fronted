import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import type { Plugin, UserConfig } from 'vite';

export type RendererTarget = 'web' | 'desktop';

export interface RendererConfigOptions {
  target: RendererTarget;
  command: 'serve' | 'build';
  mode: string;
  outDir: string;
  base: string;
  enableMock: string | undefined;
  legacyAppVersion: string | undefined;
}

const projectRoot = import.meta.dirname;
const packageVersion = (() => {
  const parsed = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
    version?: unknown;
  };
  if (
    typeof parsed.version !== 'string' ||
    !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/.test(parsed.version)
  ) {
    throw new Error('package.json.version 必须是稳定 SemVer');
  }
  return parsed.version;
})();

function assertLegacyVersionMatches(value: string | undefined): void {
  if (value && value !== packageVersion) {
    throw new Error(`VITE_APP_VERSION=${value} 与 package.json.version=${packageVersion} 不一致`);
  }
}

function assertTargetBase(target: RendererTarget, base: string): void {
  const expectedBase = target === 'desktop' ? './' : '/';
  if (base !== expectedBase) throw new Error(`${target} Renderer base 必须是 ${expectedBase}`);
}

function assertMockDisabledInProduction(options: RendererConfigOptions): void {
  if (options.command === 'build' && options.mode !== 'demo' && options.enableMock === 'true') {
    throw new Error(
      '生产构建不允许 VITE_ENABLE_MOCK=true（会把 MSW/faker 打进生产包）。' +
        'demo 构建请改用 `vite build --mode demo`（或 `pnpm build:demo`）。',
    );
  }
}

function stripMockWorkerPlugin(mode: string, outDir: string): Plugin {
  return {
    name: 'strip-mock-worker',
    closeBundle() {
      if (mode === 'demo') return;
      const workerPath = path.resolve(projectRoot, outDir, 'mockServiceWorker.js');
      if (existsSync(workerPath)) rmSync(workerPath);
    },
  };
}

function rendererChunkName(moduleId: string): string | undefined {
  if (!moduleId.includes('/node_modules/')) return undefined;
  if (/\/node_modules\/(?:react|react-dom|scheduler)\//.test(moduleId)) return 'vendor-react';
  if (moduleId.includes('/node_modules/@tanstack/')) return 'vendor-tanstack';
  if (/\/node_modules\/(?:radix-ui|@radix-ui|lucide-react)\//.test(moduleId)) return 'vendor-ui';
  return 'vendor';
}

export function createRendererConfig(options: RendererConfigOptions): UserConfig {
  assertTargetBase(options.target, options.base);
  assertMockDisabledInProduction(options);
  assertLegacyVersionMatches(options.legacyAppVersion);

  return {
    base: options.base,
    define: { __APP_VERSION__: JSON.stringify(packageVersion) },
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      stripMockWorkerPlugin(options.mode, options.outDir),
    ],
    resolve: { alias: { '@': path.resolve(projectRoot, 'src') } },
    build: {
      outDir: options.outDir,
      emptyOutDir: true,
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: { output: { manualChunks: rendererChunkName } },
    },
  };
}
