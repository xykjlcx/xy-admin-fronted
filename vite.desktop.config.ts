import path from 'node:path';
import electron, { type ElectronOptions } from 'vite-plugin-electron';
import { defineConfig, type ConfigEnv, type UserConfig } from 'vite';
import {
  readDesktopEnvironment,
  readDesktopRendererEnvironment,
  type DesktopEnvironment,
} from './electron/config';
import { createRendererConfig } from './vite.renderer.config';

interface DesktopViteConfigInput {
  environment: DesktopEnvironment;
  command: ConfigEnv['command'];
  mode: string;
  enableMock: string | undefined;
  legacyAppVersion: string | undefined;
}

const projectRoot = import.meta.dirname;

function bundleRuntimeDependencies(): false {
  // vite-plugin-electron 会在外层补充 Electron 与 Node built-in external。
  return false;
}

export function createElectronBuildTargets(environment: DesktopEnvironment): ElectronOptions[] {
  const embeddedEnvironment = JSON.stringify(environment);
  return [
    {
      entry: path.resolve(projectRoot, 'electron/main/index.ts'),
      vite: {
        define: { __DESKTOP_BUILD_ENV__: embeddedEnvironment },
        build: {
          outDir: 'out/main',
          emptyOutDir: true,
          target: 'node22',
          minify: false,
          lib: {
            entry: path.resolve(projectRoot, 'electron/main/index.ts'),
            formats: ['es'],
            fileName: () => 'index.js',
          },
          rolldownOptions: { external: bundleRuntimeDependencies },
        },
      },
    },
    {
      entry: path.resolve(projectRoot, 'electron/preload/index.ts'),
      vite: {
        define: { __DESKTOP_BUILD_ENV__: embeddedEnvironment },
        build: {
          outDir: 'out/preload',
          emptyOutDir: true,
          target: 'node22',
          minify: false,
          lib: {
            entry: path.resolve(projectRoot, 'electron/preload/index.ts'),
            formats: ['cjs'],
            fileName: () => 'index.cjs',
          },
          rolldownOptions: {
            external: bundleRuntimeDependencies,
            output: {
              format: 'cjs',
              codeSplitting: false,
              entryFileNames: 'index.cjs',
              chunkFileNames: '[name].cjs',
            },
          },
        },
      },
    },
  ];
}

export function createDesktopViteConfig(input: DesktopViteConfigInput): UserConfig {
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
    ...renderer,
    root: projectRoot,
    plugins: [...(renderer.plugins ?? []), ...electron(createElectronBuildTargets(input.environment))],
    build: {
      ...renderer.build,
      rolldownOptions: {
        ...renderer.build?.rolldownOptions,
        input: {
          index: path.resolve(projectRoot, 'index.html'),
          recovery: path.resolve(projectRoot, 'electron/renderer/recovery.html'),
        },
      },
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const environment = readDesktopEnvironment();
  const rendererEnvironment = readDesktopRendererEnvironment();
  return createDesktopViteConfig({
    environment,
    command,
    mode,
    enableMock: rendererEnvironment.enableMock,
    legacyAppVersion: rendererEnvironment.legacyAppVersion,
  });
});
