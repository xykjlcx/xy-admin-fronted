import { describe, expect, test } from 'vitest';
import { createWindowSnapshot } from './window-state';

describe('window chrome state', () => {
  test.each([
    ['darwin', 'native', 0, 0, 0],
    ['win32', 'native', 0, 0, 0],
    ['darwin', 'integrated', 80, 0, 56],
    ['win32', 'integrated', 0, 138, 56],
  ] as const)('maps %s %s to deterministic DIP safe-area tokens', (platform, chrome, left, right, height) => {
    expect(
      createWindowSnapshot({ platform, chrome, maximized: false, fullScreen: false, scaleFactor: 2 }),
    ).toEqual({
      runtime: 'desktop',
      platform,
      chrome,
      controlsInsetLeft: left,
      controlsInsetRight: right,
      titlebarHeight: height,
      maximized: false,
      fullScreen: false,
      scaleFactor: 2,
    });
  });

  test('removes native-control safe areas while full screen', () => {
    expect(
      createWindowSnapshot({
        platform: 'darwin',
        chrome: 'integrated',
        maximized: true,
        fullScreen: true,
        scaleFactor: 1,
      }),
    ).toMatchObject({
      controlsInsetLeft: 0,
      controlsInsetRight: 0,
      titlebarHeight: 0,
      maximized: true,
      fullScreen: true,
    });
  });
});
