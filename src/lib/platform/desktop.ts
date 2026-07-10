import type { DesktopApi } from '../../../electron/shared/desktop-api';
import type { AppPlatform } from './types';

export function createDesktopPlatform(api: DesktopApi): AppPlatform {
  return {
    runtime: 'desktop',
    window: { getSnapshot: () => api.window.getSnapshot() },
    clipboard: { writeText: (text) => api.clipboard.writeText(text) },
    external: { open: (url) => api.external.open(url) },
  };
}

export function readDesktopApi(): DesktopApi {
  if (!window.desktop) throw new Error('Desktop Preload API is unavailable');
  return window.desktop;
}
