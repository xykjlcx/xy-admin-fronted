import { assertSafeHttpsExternalUrl, type AppPlatform } from './types';
import { appConfig } from '@/config';
import { env } from '@/config/env';
import { downloadFile } from '@/lib/download';
import { createApiFileDownloadUrl, createPublicFileUrl } from './types';
import type { FileDownloadEvent } from '../../../electron/shared/schemas';

interface CredentialStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface WebPlatformDependencies {
  writeClipboardText(text: string): Promise<void>;
  openExternal(url: string): void;
  credentialStorage?: CredentialStorage;
  download?: typeof downloadFile;
  apiBaseUrl?: string;
  webPublicBaseUrl?: string;
  createTaskId?: () => string;
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
  download: downloadFile,
  apiBaseUrl: env.apiBaseUrl,
  webPublicBaseUrl: env.webPublicBaseUrl || window.location.origin,
  createTaskId: () => crypto.randomUUID(),
};

export function createWebPlatform(dependencies: WebPlatformDependencies = browserDependencies): AppPlatform {
  const credentialStorage = dependencies.credentialStorage ?? localStorage;
  const listeners = new Set<(event: FileDownloadEvent) => void>();
  const active = new Map<string, AbortController>();
  const createTaskId = dependencies.createTaskId ?? (() => crypto.randomUUID());
  const emit = (event: FileDownloadEvent) => {
    for (const listener of listeners) listener(event);
  };
  const runDownload = async (taskId: string, resourceId: string, suggestedName: string) => {
    const controller = active.get(taskId);
    if (!controller) return;
    try {
      emit({ taskId, status: 'progress', receivedBytes: 0, totalBytes: 0, percent: 0 });
      const bytes = await (dependencies.download ?? downloadFile)(
        createApiFileDownloadUrl(dependencies.apiBaseUrl ?? env.apiBaseUrl, resourceId),
        suggestedName,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) emit({ taskId, status: 'cancelled' });
      else {
        emit({ taskId, status: 'progress', receivedBytes: bytes, totalBytes: bytes, percent: 100 });
        emit({ taskId, status: 'completed', filename: suggestedName.slice(0, 180), bytes });
      }
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        emit({ taskId, status: 'cancelled' });
      } else {
        emit({ taskId, status: 'error', code: 'NETWORK_ERROR', message: 'Web 文件下载失败' });
      }
    } finally {
      active.delete(taskId);
    }
  };
  return {
    runtime: 'web',
    window: {
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
    files: {
      save: async ({ resourceId, suggestedName }) => {
        const taskId = createTaskId();
        active.set(taskId, new AbortController());
        queueMicrotask(() => void runDownload(taskId, resourceId, suggestedName));
        return { taskId };
      },
      cancel: async (taskId) => active.get(taskId)?.abort(),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      createShareUrl: (resourceId) =>
        createPublicFileUrl(dependencies.webPublicBaseUrl ?? env.webPublicBaseUrl, resourceId),
    },
  };
}
