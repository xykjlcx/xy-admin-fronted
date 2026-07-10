import { env } from '@/config/env';
import { createDesktopPlatform, readDesktopApi } from './desktop';
import { createWebPlatform } from './web';

export type { AppPlatform, HostRuntime, PlatformWindowSnapshot } from './types';

export const platform =
  env.runtime === 'desktop' ? createDesktopPlatform(readDesktopApi()) : createWebPlatform();
