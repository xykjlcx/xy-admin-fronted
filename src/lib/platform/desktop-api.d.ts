import type { DesktopApi } from '../../../electron/shared/desktop-api';

declare global {
  const __APP_VERSION__: string;

  interface Window {
    desktop?: DesktopApi;
  }
}

export {};
