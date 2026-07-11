import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');

describe('Sonner CSP contract', () => {
  test('ships toast styles as a static asset and disables runtime style injection', () => {
    const globalCss = readFileSync(path.join(root, 'src/styles/global.css'), 'utf8');
    const esmSource = readFileSync(path.join(root, 'node_modules/sonner/dist/index.mjs'), 'utf8');
    const commonJsSource = readFileSync(path.join(root, 'node_modules/sonner/dist/index.js'), 'utf8');

    expect(globalCss).toContain("@import 'sonner/dist/styles.css';");
    expect(esmSource).toMatch(/function __insertCSS\(code\) \{[\s\S]{0,160}\n[ ]{2}return/);
    expect(commonJsSource).toMatch(/function __insertCSS\(code\) \{[\s\S]{0,160}\n[ ]{2}return/);
  });
});
