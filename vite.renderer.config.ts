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

const rendererChunkGroups = [
  { name: 'vendor-react', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/, priority: 40 },
  { name: 'vendor-tanstack', test: /node_modules[\\/]@tanstack[\\/]/, priority: 30 },
  {
    name: 'vendor-ui',
    test: /node_modules[\\/](?:radix-ui|@radix-ui|lucide-react)[\\/]/,
    priority: 20,
  },
  { name: 'vendor', test: /node_modules[\\/]/, priority: 10 },
];

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
      minify: 'oxc',
      sourcemap: false,
      rolldownOptions: { output: { codeSplitting: { groups: rendererChunkGroups } } },
    },
  };
}
