import { assertSafeHttpsExternalUrl, type AppPlatform } from './types';

interface WebPlatformDependencies {
  writeClipboardText(text: string): Promise<void>;
  openExternal(url: string): void;
}

const browserDependencies: WebPlatformDependencies = {
  writeClipboardText: async (text) => {
    if (!navigator.clipboard) throw new Error('Clipboard is unavailable');
    await navigator.clipboard.writeText(text);
  },
  openExternal: (url) => {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) throw new Error('External window is unavailable');
  },
};

export function createWebPlatform(dependencies: WebPlatformDependencies = browserDependencies): AppPlatform {
  return {
    runtime: 'web',
    window: { getSnapshot: () => ({ runtime: 'web', platform: 'browser', chrome: 'native' }) },
    clipboard: { writeText: (text) => dependencies.writeClipboardText(text) },
    external: {
      open: async (url) => dependencies.openExternal(assertSafeHttpsExternalUrl(url)),
    },
  };
}
