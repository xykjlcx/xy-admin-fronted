import { expect, test, vi } from 'vitest';
import { bindHostWindow } from '@/app/host-window';
import type { PlatformWindowSnapshot } from '@/lib/platform/types';

const integratedSnapshot: PlatformWindowSnapshot = {
  runtime: 'desktop',
  platform: 'darwin',
  chrome: 'integrated',
  controlsInsetLeft: 80,
  controlsInsetRight: 0,
  titlebarHeight: 56,
  maximized: false,
  fullScreen: false,
  scaleFactor: 2,
};

test('projects host snapshot into root data attributes and CSS safe-area tokens', () => {
  let listener: ((snapshot: PlatformWindowSnapshot) => void) | undefined;
  const root = document.createElement('html');
  const dispose = vi.fn();
  const unbind = bindHostWindow(
    {
      getSnapshot: () => integratedSnapshot,
      subscribe: (next) => {
        listener = next;
        return dispose;
      },
    },
    root,
  );

  expect(root.dataset).toMatchObject({
    runtime: 'desktop',
    windowChrome: 'integrated',
    platform: 'darwin',
    displayScale: '2',
  });
  expect(root.style.getPropertyValue('--window-controls-inset-left')).toBe('80px');
  expect(root.style.getPropertyValue('--window-controls-inset-right')).toBe('0px');
  expect(root.style.getPropertyValue('--desktop-titlebar-height')).toBe('56px');

  listener?.({ ...integratedSnapshot, fullScreen: true, controlsInsetLeft: 0, titlebarHeight: 0 });
  expect(root.dataset.fullScreen).toBe('true');
  expect(root.style.getPropertyValue('--window-controls-inset-left')).toBe('0px');
  expect(root.style.getPropertyValue('--desktop-titlebar-height')).toBe('0px');

  unbind();
  expect(dispose).toHaveBeenCalledOnce();
});

test('Web host always projects zero safe-area tokens', () => {
  const root = document.createElement('html');
  bindHostWindow(
    {
      getSnapshot: () => ({
        runtime: 'web',
        platform: 'browser',
        chrome: 'native',
        controlsInsetLeft: 0,
        controlsInsetRight: 0,
        titlebarHeight: 0,
        maximized: false,
        fullScreen: false,
        scaleFactor: 1,
      }),
      subscribe: () => () => undefined,
    },
    root,
  );

  expect(root.dataset.runtime).toBe('web');
  expect(root.style.getPropertyValue('--window-controls-inset-left')).toBe('0px');
  expect(root.style.getPropertyValue('--window-controls-inset-right')).toBe('0px');
  expect(root.style.getPropertyValue('--desktop-titlebar-height')).toBe('0px');
});
