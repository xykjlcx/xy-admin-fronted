import type { DesktopApi } from '../../../electron/shared/desktop-api';
import type { AppPlatform } from './types';

export function createDesktopPlatform(api: DesktopApi): AppPlatform {
  return {
    runtime: 'desktop',
    window: {
      getSnapshot: () => api.window.getSnapshot(),
      subscribe: (listener) => api.window.subscribe(listener),
    },
    clipboard: { writeText: (text) => api.clipboard.writeText(text) },
    external: { open: (url) => api.external.open(url) },
    credentials: {
      restore: () => api.credentials.restore(),
      persist: (token) => api.credentials.persist(token),
      clear: (reason) => api.credentials.clear(reason),
    },
  };
}

export function readDesktopApi(): DesktopApi {
  if (!window.desktop) throw new Error('Desktop Preload API is unavailable');
  return window.desktop;
}
