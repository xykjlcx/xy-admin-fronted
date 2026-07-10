import { assertSafeHttpsExternalUrl, type AppPlatform } from './types';
import { appConfig } from '@/config';

interface CredentialStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface WebPlatformDependencies {
  writeClipboardText(text: string): Promise<void>;
  openExternal(url: string): void;
  credentialStorage?: CredentialStorage;
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
  const credentialStorage = dependencies.credentialStorage ?? localStorage;
  return {
    runtime: 'web',
    window: { getSnapshot: () => ({ runtime: 'web', platform: 'browser', chrome: 'native' }) },
    clipboard: { writeText: (text) => dependencies.writeClipboardText(text) },
    external: {
      open: async (url) => dependencies.openExternal(assertSafeHttpsExternalUrl(url)),
    },
    credentials: {
      restore: async () => {
        const raw = credentialStorage.getItem(appConfig.storageKeys.auth);
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw) as { state?: { token?: unknown } };
          return typeof parsed.state?.token === 'string' ? parsed.state.token : null;
        } catch {
          return null;
        }
      },
      persist: async (token) => {
        credentialStorage.setItem(
          appConfig.storageKeys.auth,
          JSON.stringify({ state: { token }, version: 0 }),
        );
      },
      clear: async () => credentialStorage.removeItem(appConfig.storageKeys.auth),
    },
  };
}
