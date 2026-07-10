import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
};
const pnpmWorkspace = readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8');
const gitignore = readFileSync(path.join(root, '.gitignore'), 'utf8');

describe('desktop toolchain contract', () => {
  test('pins the stable Vite and Electron toolchain selected for dual-host builds', () => {
    expect(packageJson.devDependencies.vite).toBe('7.3.6');
    expect(packageJson.devDependencies['@vitejs/plugin-react']).toBe('5.2.0');
    expect(packageJson.devDependencies.electron).toBe('43.1.0');
    expect(packageJson.devDependencies['electron-vite']).toBe('5.0.0');
    expect(packageJson.devDependencies['electron-builder']).toBe('26.15.3');
    expect(packageJson.dependencies['electron-updater']).toBe('6.8.9');
    expect(packageJson.devDependencies['@electron/fuses']).toBe('2.1.3');
    expect(packageJson.devDependencies['@playwright/test']).toBe('1.61.1');
  });

  test('keeps explicit Web and Desktop command families', () => {
    expect(packageJson.scripts['build:web']).toBeDefined();
    expect(packageJson.scripts['dev:desktop']).toBeDefined();
    expect(packageJson.scripts['build:desktop']).toBeDefined();
    expect(packageJson.scripts['make:desktop']).toBeDefined();
    expect(packageJson.scripts['typecheck:desktop']).toBe('tsc -p tsconfig.desktop.json --noEmit');
    expect(packageJson.scripts['test:desktop:unit']).toContain('--config vitest.desktop.config.ts');
    expect(packageJson.scripts['test:desktop']).toContain('scripts/run-packaged-spike.mjs');
  });

  test('explicitly approves the esbuild install script required by Vite 7', () => {
    expect(pnpmWorkspace).toMatch(/allowBuilds:\s+[\s\S]*esbuild: true/);
    expect(pnpmWorkspace).toMatch(/onlyBuiltDependencies:\s+[\s\S]*- esbuild/);
  });

  test('explicitly approves the Windows installer helper required by electron-builder', () => {
    expect(pnpmWorkspace).toMatch(/allowBuilds:\s+[\s\S]*electron-winstaller: true/);
    expect(pnpmWorkspace).toMatch(/onlyBuiltDependencies:\s+[\s\S]*- electron-winstaller/);
  });

  test('keeps Electron outputs and generated Spike certificates outside Git', () => {
    expect(gitignore).toMatch(/^out\/$/m);
    expect(gitignore).toMatch(/^release\/$/m);
    expect(gitignore).toMatch(/^test-results\/$/m);
  });

  test('provides the packaged Spike build and runtime entrypoints', () => {
    const requiredFiles = [
      'desktop.config.ts',
      'electron.vite.config.ts',
      'electron-builder.yml',
      'vitest.desktop.config.ts',
      'tsconfig.desktop.json',
      'scripts/desktop-command.mjs',
      'scripts/run-packaged-spike.mjs',
      'electron/main/index.ts',
      'electron/main/protocol.ts',
      'electron/preload/index.ts',
      'electron/shared/schemas.ts',
    ];

    for (const file of requiredFiles) expect(existsSync(path.join(root, file)), file).toBe(true);
  });

  test('keeps the renderer HTML compatible with strict packaged CSP and relative assets', () => {
    const html = readFileSync(path.join(root, 'index.html'), 'utf8');
    expect(html).toContain('href="%BASE_URL%favicon.svg"');
    expect(html).toContain('src="%BASE_URL%theme-bootstrap.js"');
    expect(html).not.toMatch(/<script(?![^>]+src=)[^>]*>[\s\S]*?<\/script>/);
    expect(existsSync(path.join(root, 'public/theme-bootstrap.js'))).toBe(true);
  });
});
