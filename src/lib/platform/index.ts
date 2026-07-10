import { env } from '@/config/env';
import { createDesktopPlatform, readDesktopApi } from './desktop';
import { createWebPlatform } from './web';

export type {
  AppPlatform,
  FileDownloadEvent,
  FileDownloadStartInput,
  FileDownloadStartResult,
  HostRuntime,
  PlatformWindowSnapshot,
} from './types';

export const platform =
  env.runtime === 'desktop'
    ? createDesktopPlatform(readDesktopApi(), env.webPublicBaseUrl)
    : createWebPlatform();
