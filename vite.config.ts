import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { createRendererConfig } from './vite.renderer.config.ts';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const rawEnv = loadEnv(mode, __dirname, 'VITE_');

  return {
    ...createRendererConfig({
      target: 'web',
      command,
      mode,
      outDir: 'dist',
      base: '/',
      enableMock: rawEnv.VITE_ENABLE_MOCK,
      legacyAppVersion: rawEnv.VITE_APP_VERSION,
    }),
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      setupFiles: './src/test-setup.ts',
    },
  };
});
