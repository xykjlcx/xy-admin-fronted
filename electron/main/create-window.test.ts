import { describe, expect, test } from 'vitest';
import { createWindowOptions } from './create-window';

describe('BrowserWindow security and chrome options', () => {
  test.each([
    ['darwin', 'native', undefined, undefined],
    ['darwin', 'integrated', 'hiddenInset', undefined],
    ['win32', 'native', undefined, undefined],
    ['win32', 'integrated', undefined, expect.any(Object)],
  ] as const)(
    'maps %s %s without weakening Renderer isolation',
    (platform, chrome, titleBarStyle, titleBarOverlay) => {
      const options = createWindowOptions({
        platform,
        windowChrome: chrome,
        preloadPath: '/app/out/preload/index.cjs',
      });

      expect(options).toMatchObject({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 640,
        titleBarStyle,
        titleBarOverlay,
        webPreferences: {
          preload: '/app/out/preload/index.cjs',
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      });
    },
  );
});
