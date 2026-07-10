import type { BrowserWindowConstructorOptions } from 'electron';
import type { WindowChromeMode } from '../config';

interface CreateWindowOptionsInput {
  platform: 'darwin' | 'win32';
  windowChrome: WindowChromeMode;
  preloadPath: string;
}

export function createWindowOptions(input: CreateWindowOptionsInput): BrowserWindowConstructorOptions {
  const integrated = input.windowChrome === 'integrated';

  return {
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    titleBarStyle: integrated && input.platform === 'darwin' ? 'hiddenInset' : undefined,
    titleBarOverlay: integrated && input.platform === 'win32' ? { height: 48 } : undefined,
    webPreferences: {
      preload: input.preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  };
}
