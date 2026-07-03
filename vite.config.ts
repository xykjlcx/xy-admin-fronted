import { defineConfig } from 'vitest/config';
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

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
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
}));
