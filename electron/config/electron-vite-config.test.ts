import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { createElectronViteConfig } from '../../electron.vite.config';
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

describe('electron-vite build graph', () => {
  test('builds Main, Preload, and the shared Renderer into isolated output roots', () => {
    const config = createElectronViteConfig({
      environment,
      command: 'build',
      mode: 'production',
      enableMock: undefined,
    });

    expect(config.main?.build?.outDir).toBe('out/main');
    expect(config.main?.build?.rollupOptions?.input).toBe(
      path.resolve(import.meta.dirname, '../main/index.ts'),
    );
    expect(config.main?.define?.__DESKTOP_BUILD_ENV__).toBe(JSON.stringify(environment));
    expect(config.preload?.build).toMatchObject({
      outDir: 'out/preload',
      externalizeDeps: false,
      isolatedEntries: false,
      rollupOptions: {
        output: { inlineDynamicImports: true, format: 'cjs', entryFileNames: 'index.cjs' },
      },
    });
    expect(config.preload?.build?.rollupOptions?.input).toBe(
      path.resolve(import.meta.dirname, '../preload/index.ts'),
    );
    expect(config.renderer).toMatchObject({ base: './', build: { outDir: 'out/renderer' } });
    expect(config.renderer?.root).toBe(path.resolve(import.meta.dirname, '../..'));
    expect(config.renderer?.build?.rollupOptions?.input).toBe(
      path.resolve(import.meta.dirname, '../../index.html'),
    );
    expect(config.renderer?.plugins).toBeDefined();
  });
});
