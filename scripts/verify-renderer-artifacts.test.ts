import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { verifyRendererArtifacts } from './verify-renderer-artifacts.mjs';

const roots: string[] = [];

function createArtifact(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'renderer-artifact-'));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('renderer artifact guard', () => {
  test.each(['web', 'desktop'] as const)('accepts a compact clean %s renderer', (target) => {
    const result = verifyRendererArtifacts(
      createArtifact({ 'index.html': '<main></main>', 'assets/main.js': 'ok' }),
      target,
    );
    expect(result).toMatchObject({ target, largestJavaScriptBytes: 2 });
  });

  test('rejects desktop-only code in the Web bundle and mock code in Desktop', () => {
    expect(() =>
      verifyRendererArtifacts(createArtifact({ 'assets/main.js': 'contextBridge ipcRenderer' }), 'web'),
    ).toThrow('Web Renderer 包含桌面运行时代码');
    expect(() =>
      verifyRendererArtifacts(
        createArtifact({ 'assets/main.js': 'mockServiceWorker setupWorker' }),
        'desktop',
      ),
    ).toThrow('Desktop Renderer 包含 Mock 运行时代码');
  });

  test('rejects secrets, test artifacts, and a Vite downgrade bundle regression', () => {
    expect(() =>
      verifyRendererArtifacts(createArtifact({ '.env.production': 'SECRET=value' }), 'web'),
    ).toThrow('禁止打包的文件');
    expect(() =>
      verifyRendererArtifacts(createArtifact({ 'assets/main.js': 'x'.repeat(310_001) }), 'web'),
    ).toThrow('最大 JavaScript chunk');
  });
});
