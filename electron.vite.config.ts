import path from 'node:path';
import { defineConfig, type UserConfig } from 'electron-vite';
import {
  readDesktopEnvironment,
  readDesktopRendererEnvironment,
  type DesktopEnvironment,
} from './electron/config';
import { createRendererConfig } from './vite.renderer.config';

interface ElectronViteConfigInput {
  environment: DesktopEnvironment;
  command: 'serve' | 'build';
  mode: string;
  enableMock: string | undefined;
  legacyAppVersion: string | undefined;
}

const projectRoot = import.meta.dirname;

export function createElectronViteConfig(input: ElectronViteConfigInput): UserConfig {
  const embeddedEnvironment = JSON.stringify(input.environment);
  const renderer = createRendererConfig({
    target: 'desktop',
    command: input.command,
    mode: input.mode,
    outDir: 'out/renderer',
    base: './',
    enableMock: input.enableMock,
    legacyAppVersion: input.legacyAppVersion,
  });

  return {
    main: {
      define: { __DESKTOP_BUILD_ENV__: embeddedEnvironment },
      build: {
        outDir: 'out/main',
        rollupOptions: { input: path.resolve(projectRoot, 'electron/main/index.ts') },
      },
    },
    preload: {
      define: { __DESKTOP_BUILD_ENV__: embeddedEnvironment },
      build: {
        outDir: 'out/preload',
        externalizeDeps: false,
        isolatedEntries: false,
        rollupOptions: {
          input: path.resolve(projectRoot, 'electron/preload/index.ts'),
          output: { inlineDynamicImports: true, format: 'cjs', entryFileNames: 'index.cjs' },
        },
      },
    },
    renderer: {
      ...renderer,
      root: projectRoot,
      build: {
        ...renderer.build,
        rollupOptions: {
          ...renderer.build?.rollupOptions,
          input: path.resolve(projectRoot, 'index.html'),
        },
      },
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const environment = readDesktopEnvironment();
  const rendererEnvironment = readDesktopRendererEnvironment();
  return createElectronViteConfig({
    environment,
    command,
    mode,
    enableMock: rendererEnvironment.enableMock,
    legacyAppVersion: rendererEnvironment.legacyAppVersion,
  });
});
