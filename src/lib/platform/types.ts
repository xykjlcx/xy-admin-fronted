export type HostRuntime = 'web' | 'desktop';
export type SessionClearReason = 'logout' | 'expired' | 'switch-account';

export type PlatformWindowSnapshot =
  | {
      runtime: 'web';
      platform: 'browser';
      chrome: 'native';
      controlsInsetLeft: 0;
      controlsInsetRight: 0;
      titlebarHeight: 0;
      maximized: false;
      fullScreen: false;
      scaleFactor: 1;
    }
  | {
      runtime: 'desktop';
      platform: 'darwin' | 'win32';
      chrome: 'native' | 'integrated';
      controlsInsetLeft: number;
      controlsInsetRight: number;
      titlebarHeight: number;
      maximized: boolean;
      fullScreen: boolean;
      scaleFactor: number;
    };

export interface AppPlatform {
  readonly runtime: HostRuntime;
  readonly window: {
    getSnapshot(): PlatformWindowSnapshot;
    subscribe(listener: (snapshot: PlatformWindowSnapshot) => void): () => void;
  };
  readonly clipboard: {
    writeText(text: string): Promise<void>;
  };
  readonly external: {
    open(url: string): Promise<void>;
  };
  readonly credentials: {
    restore(): Promise<string | null>;
    persist(token: string): Promise<void>;
    clear(reason: SessionClearReason): Promise<void>;
  };
  readonly files: {
    save(input: FileDownloadStartInput): Promise<FileDownloadStartResult>;
    cancel(taskId: string): Promise<void>;
    subscribe(listener: (event: FileDownloadEvent) => void): () => void;
    createShareUrl(resourceId: string): string;
  };
}

export function createPublicFileUrl(webPublicBaseUrl: string, resourceId: string): string {
  const relative = `admin/files?fileId=${encodeURIComponent(resourceId)}`;
  if (!webPublicBaseUrl) return `/${relative}`;
  const base = new URL(webPublicBaseUrl);
  const localHttp =
    base.protocol === 'http:' && (base.hostname === 'localhost' || base.hostname === '127.0.0.1');
  if (base.protocol !== 'https:' && !localHttp) {
    throw new Error('Web public base URL 必须使用 HTTPS，本地开发 localhost 除外');
  }
  if (base.username || base.password) throw new Error('Web public base URL 禁止包含凭据');
  const normalizedBase = base.toString().endsWith('/') ? base.toString() : `${base.toString()}/`;
  return new URL(relative, normalizedBase).toString();
}

export function createApiFileDownloadUrl(apiBaseUrl: string, resourceId: string): string {
  const route = `/api/files/${encodeURIComponent(resourceId)}/download`;
  if (!apiBaseUrl) return route;
  return `${apiBaseUrl.replace(/\/$/, '')}${route}`;
}

export function assertSafeHttpsExternalUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('外链必须是无凭据、默认端口的 HTTPS URL');
  }
  return url.toString();
}
import type {
  FileDownloadEvent,
  FileDownloadStartInput,
  FileDownloadStartResult,
} from '../../../electron/shared/schemas';

export type {
  FileDownloadEvent,
  FileDownloadStartInput,
  FileDownloadStartResult,
} from '../../../electron/shared/schemas';
