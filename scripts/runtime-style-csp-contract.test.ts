import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');

describe('runtime style CSP contract', () => {
  test('uses static scroll-lock CSS and a no-op style singleton hook', () => {
    const globalCss = readFileSync(path.join(root, 'src/styles/global.css'), 'utf8');
    const pnpmStore = path.join(root, 'node_modules/.pnpm');
    const packageFolder = readdirSync(pnpmStore).find((entry) =>
      entry.startsWith('react-style-singleton@2.2.3_patch_hash='),
    );
    expect(packageFolder).toBeDefined();
    const moduleRoot = path.join(
      pnpmStore,
      packageFolder ?? '',
      'node_modules/react-style-singleton/dist',
    );

    expect(globalCss).toContain('body[data-scroll-locked]');
    for (const variant of ['es5', 'es2015', 'es2019']) {
      const source = readFileSync(path.join(moduleRoot, variant, 'hook.js'), 'utf8');
      expect(source).toContain('CSP_STATIC_SCROLL_LOCK');
      expect(source).not.toContain('sheet.add(styles)');
    }
  });
});
