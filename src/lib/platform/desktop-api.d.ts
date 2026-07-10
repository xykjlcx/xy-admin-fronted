import type { DesktopApi } from '../../../electron/shared/desktop-api';

declare global {
  interface Window {
    desktop?: DesktopApi;
  }
}

export {};
