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
}

export function assertSafeHttpsExternalUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('外链必须是无凭据、默认端口的 HTTPS URL');
  }
  return url.toString();
}
