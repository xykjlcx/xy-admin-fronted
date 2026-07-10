import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { buildRendererCsp, resolveRendererAssetPath } from './protocol';

const rendererRoot = path.resolve('/tmp/out/renderer');

describe('app renderer protocol', () => {
  test('maps only the renderer host into the packaged renderer root', () => {
    expect(resolveRendererAssetPath('app://renderer/index.html', rendererRoot)).toBe(
      path.join(rendererRoot, 'index.html'),
    );
    expect(resolveRendererAssetPath('app://renderer/assets/main.js', rendererRoot)).toBe(
      path.join(rendererRoot, 'assets/main.js'),
    );
  });

  test.each([
    'app://other/index.html',
    'https://renderer/index.html',
    'app://renderer/%2e%2e/main/index.js',
    'app://renderer/assets/%2e%2e/%2e%2e/secret.txt',
    'app://renderer/.env',
    'app://renderer/assets/notes.txt',
  ])('rejects protocol requests outside the renderer boundary: %s', (url) => {
    expect(() => resolveRendererAssetPath(url, rendererRoot)).toThrow('非法 Renderer 资源请求');
  });

  test('builds a production CSP without script inline or eval permissions', () => {
    const csp = buildRendererCsp('https://api.example.com');

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src-elem 'self'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).toContain("connect-src 'self' https://api.example.com");
    expect(csp).toContain("worker-src 'none'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain('unsafe-eval');
  });
});
