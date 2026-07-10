import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { createRendererConfig } from '../../vite.renderer.config';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('shared renderer config', () => {
  test.each([
    ['web', 'dist', '/'],
    ['desktop', 'out/renderer', './'],
  ] as const)('keeps one plugin pipeline for the %s renderer', (target, outDir, base) => {
    const config = createRendererConfig({
      target,
      command: 'build',
      mode: 'production',
      outDir,
      base,
      enableMock: undefined,
    });
    const pluginNames = (config.plugins ?? [])
      .flat()
      .map((plugin) => plugin && 'name' in plugin && plugin.name);

    expect(config.base).toBe(base);
    expect(config.build?.outDir).toBe(outDir);
    expect(pluginNames).toEqual(
      expect.arrayContaining([
        'tanstack:router-generator',
        'vite:react-babel',
        '@tailwindcss/vite:generate:serve',
        'strip-mock-worker',
      ]),
    );
    expect(config.resolve?.alias).toEqual({ '@': expect.stringMatching(/\/src$/) });
  });

  test('rejects a non-demo production renderer build with mock enabled', () => {
    expect(() =>
      createRendererConfig({
        target: 'desktop',
        command: 'build',
        mode: 'production',
        outDir: 'out/renderer',
        base: './',
        enableMock: 'true',
      }),
    ).toThrow('VITE_ENABLE_MOCK=true');
  });

  test('strips the mock worker from the actual renderer output directory', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'renderer-config-'));
    temporaryDirectories.push(root);
    const outDir = path.join(root, 'custom-output');
    mkdirSync(outDir);
    const workerPath = path.join(outDir, 'mockServiceWorker.js');
    writeFileSync(workerPath, 'mock worker');

    const config = createRendererConfig({
      target: 'desktop',
      command: 'build',
      mode: 'production',
      outDir,
      base: './',
      enableMock: undefined,
    });
    const stripPlugin = (config.plugins ?? [])
      .flat()
      .find((plugin) => plugin && 'name' in plugin && plugin.name === 'strip-mock-worker');
    expect(stripPlugin).toBeDefined();
    if (!stripPlugin || !('closeBundle' in stripPlugin) || typeof stripPlugin.closeBundle !== 'function')
      return;
    stripPlugin.closeBundle.call({} as never);

    expect(existsSync(workerPath)).toBe(false);
  });

  test('does not read runtime environment inside the shared factory', () => {
    const source = readFileSync(path.resolve(import.meta.dirname, '../../vite.renderer.config.ts'), 'utf8');
    expect(source).not.toContain('process.env');
    expect(source).not.toContain('import.meta.env');
    expect(source).not.toContain('loadEnv(');
  });
});
