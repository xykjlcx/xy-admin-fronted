import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { resolveViteConfig, withExternalBuiltins } from 'vite-plugin-electron';
import { createDesktopViteConfig, createElectronBuildTargets } from '../../vite.desktop.config';
import type { DesktopEnvironment } from './index';

const environment: DesktopEnvironment = {
  mode: 'production',
  apiBaseUrl: 'https://api.example.com/v1',
  apiOrigin: 'https://api.example.com',
  webPublicBaseUrl: 'https://app.example.com/',
  updateBaseUrl: 'https://updates.example.com/',
  windowChrome: 'native',
  spikeMode: false,
  allowInsecureLocalhost: false,
  downloadAllowedOrigins: [],
};

describe('Vite 8 desktop build graph', () => {
  test('builds Main, Preload, and the shared Renderer into isolated output roots', () => {
    const targets = createElectronBuildTargets(environment);
    const config = createDesktopViteConfig({
      environment,
      command: 'build',
      mode: 'production',
      enableMock: undefined,
      legacyAppVersion: undefined,
    });

    const main = targets[0];
    const preload = targets[1];
    expect(main?.entry).toBe(path.resolve(import.meta.dirname, '../main/index.ts'));
    expect(main?.vite?.define?.__DESKTOP_BUILD_ENV__).toBe(JSON.stringify(environment));
    expect(main?.vite?.build).toMatchObject({
      outDir: 'out/main',
      lib: { formats: ['es'] },
      rolldownOptions: { external: expect.any(Function) },
    });
    expect(main?.vite?.build?.rollupOptions).toBeUndefined();
    if (!main) throw new Error('Main build target is missing');
    const resolvedMain = withExternalBuiltins(resolveViteConfig(main));
    const external = resolvedMain.build?.rolldownOptions?.external;
    if (typeof external !== 'function') throw new Error('Main externalization policy is missing');
    expect(external('electron', undefined, false)).toBe(true);
    expect(external('node:fs', undefined, false)).toBe(true);
    expect(external('electron-updater', undefined, false)).toBe(false);
    expect(preload?.entry).toBe(path.resolve(import.meta.dirname, '../preload/index.ts'));
    expect(preload?.vite?.build).toMatchObject({
      outDir: 'out/preload',
      lib: { formats: ['cjs'] },
      rolldownOptions: { output: { codeSplitting: false, entryFileNames: 'index.cjs' } },
    });
    expect(preload?.vite?.build?.rollupOptions).toBeUndefined();
    expect(config).toMatchObject({ base: './', build: { outDir: 'out/renderer' } });
    expect(config.root).toBe(path.resolve(import.meta.dirname, '../..'));
    expect(config.build?.rolldownOptions?.input).toEqual({
      index: path.resolve(import.meta.dirname, '../../index.html'),
      recovery: path.resolve(import.meta.dirname, '../renderer/recovery.html'),
    });
    expect(config.build?.rollupOptions).toBeUndefined();
    expect(config.plugins).toBeDefined();
    expect(config.define?.__APP_VERSION__).toBe(JSON.stringify('0.1.0'));
  });
});
