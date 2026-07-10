import { describe, expect, test } from 'vitest';
import { createDesktopCommandPlan, parseDesktopCommand } from './desktop-command.mjs';

const productionEnv = {
  VITE_API_BASE_URL: 'https://api.example.com',
  VITE_WEB_PUBLIC_BASE_URL: 'https://app.example.com',
  DESKTOP_UPDATE_BASE_URL: 'https://updates.example.com',
};

describe('desktop command parser', () => {
  test('defaults to native chrome and accepts an explicit integrated build', () => {
    expect(parseDesktopCommand(['build'], productionEnv)).toMatchObject({
      command: 'build',
      windowChrome: 'native',
      environment: {
        NODE_ENV: 'production',
        VITE_API_BASE_URL: 'https://api.example.com',
        VITE_WEB_PUBLIC_BASE_URL: 'https://app.example.com/',
        DESKTOP_UPDATE_BASE_URL: 'https://updates.example.com/',
      },
    });
    expect(parseDesktopCommand(['build', '--window-chrome=integrated'], productionEnv)).toMatchObject({
      command: 'build',
      windowChrome: 'integrated',
    });
  });

  test.each(['floating', '', 'INTEGRATED'])('rejects an invalid window chrome value: %s', (value) => {
    expect(() => parseDesktopCommand(['build', `--window-chrome=${value}`], productionEnv)).toThrow(
      'window-chrome 只能是 native 或 integrated',
    );
  });

  test.each([
    [{ ...productionEnv, VITE_API_BASE_URL: '' }, 'VITE_API_BASE_URL'],
    [{ ...productionEnv, VITE_API_BASE_URL: '/api' }, 'VITE_API_BASE_URL'],
    [{ ...productionEnv, VITE_API_BASE_URL: 'http://api.example.com' }, 'VITE_API_BASE_URL'],
    [{ ...productionEnv, DESKTOP_UPDATE_BASE_URL: '' }, 'DESKTOP_UPDATE_BASE_URL'],
  ])('fails a production command when a required HTTPS URL is invalid', (env, key) => {
    expect(() => parseDesktopCommand(['build'], env)).toThrow(key);
  });

  test('creates deterministic cross-platform process plans without shell-only environment syntax', () => {
    const parsed = parseDesktopCommand(['make', '--window-chrome=integrated'], productionEnv);
    expect(createDesktopCommandPlan(parsed, 'darwin')).toEqual([
      { executable: 'tsc', args: ['-b', '--noEmit'] },
      { executable: 'tsc', args: ['-p', 'tsconfig.desktop.json', '--noEmit'] },
      { executable: 'node', args: ['scripts/desktop-boundary-guard.mjs'] },
      { executable: 'electron-vite', args: ['build'] },
      { executable: 'node', args: ['scripts/verify-renderer-artifacts.mjs', 'desktop'] },
      { executable: 'electron-builder', args: ['--mac', '--arm64', '--x64'] },
    ]);
    expect(createDesktopCommandPlan(parsed, 'win32')).toEqual([
      { executable: 'tsc', args: ['-b', '--noEmit'] },
      { executable: 'tsc', args: ['-p', 'tsconfig.desktop.json', '--noEmit'] },
      { executable: 'node', args: ['scripts/desktop-boundary-guard.mjs'] },
      { executable: 'electron-vite', args: ['build'] },
      { executable: 'node', args: ['scripts/verify-renderer-artifacts.mjs', 'desktop'] },
      { executable: 'electron-builder', args: ['--win', '--x64'] },
    ]);
  });
});
