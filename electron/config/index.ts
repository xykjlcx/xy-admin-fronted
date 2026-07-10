import { z } from 'zod';
import { desktopDefaults } from '../../desktop.config';

const windowChromeSchema = z.enum(['native', 'integrated']);

export type WindowChromeMode = z.infer<typeof windowChromeSchema>;

export interface DesktopEnvironment {
  mode: 'development' | 'production';
  apiBaseUrl: string;
  apiOrigin: string;
  webPublicBaseUrl: string;
  updateBaseUrl: string;
  windowChrome: WindowChromeMode;
  spikeMode: boolean;
  allowInsecureLocalhost: boolean;
}

type RawEnvironment = Record<string, string | undefined>;

function parseBoolean(environment: RawEnvironment, key: string): boolean {
  const value = environment[key];
  if (value === undefined || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${key} 必须是 true 或 false`);
}

function parseUrl(environment: RawEnvironment, key: string, requireHttps: boolean): URL {
  const value = environment[key];
  let url: URL;
  try {
    url = new URL(value ?? '');
  } catch {
    throw new Error(`${key} 必须是绝对 URL`);
  }

  if (url.username || url.password || (requireHttps && url.protocol !== 'https:')) {
    throw new Error(`${key} 必须是无凭据的绝对 HTTPS URL`);
  }
  if (!requireHttps && url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${key} 必须使用 HTTP 或 HTTPS`);
  }
  return url;
}

function withTrailingSlash(url: URL): string {
  const value = url.toString();
  return value.endsWith('/') ? value : `${value}/`;
}

export function parseDesktopEnvironment(environment: RawEnvironment): DesktopEnvironment {
  const mode = environment.NODE_ENV === 'production' ? 'production' : 'development';
  const requireHttps = mode === 'production';
  const resolvedEnvironment =
    mode === 'development'
      ? {
          VITE_API_BASE_URL: desktopDefaults.development.apiBaseUrl,
          VITE_WEB_PUBLIC_BASE_URL: desktopDefaults.development.webPublicBaseUrl,
          DESKTOP_UPDATE_BASE_URL: desktopDefaults.development.updateBaseUrl,
          ...environment,
        }
      : environment;
  const apiUrl = parseUrl(resolvedEnvironment, 'VITE_API_BASE_URL', requireHttps);
  const webPublicUrl = parseUrl(resolvedEnvironment, 'VITE_WEB_PUBLIC_BASE_URL', requireHttps);
  const updateUrl = parseUrl(resolvedEnvironment, 'DESKTOP_UPDATE_BASE_URL', true);
  const windowChrome = windowChromeSchema.safeParse(environment.DESKTOP_WINDOW_CHROME ?? 'native');
  if (!windowChrome.success) throw new Error('DESKTOP_WINDOW_CHROME 必须是 native 或 integrated');

  const spikeMode = parseBoolean(environment, 'DESKTOP_SPIKE_MODE');
  const allowInsecureLocalhost = parseBoolean(environment, 'DESKTOP_ALLOW_INSECURE_LOCALHOST');
  if (allowInsecureLocalhost && !spikeMode) {
    throw new Error('DESKTOP_ALLOW_INSECURE_LOCALHOST 只能在 DESKTOP_SPIKE_MODE=true 时启用');
  }
  if (allowInsecureLocalhost && apiUrl.hostname !== 'localhost') {
    throw new Error('DESKTOP_ALLOW_INSECURE_LOCALHOST 只允许 localhost API');
  }

  return {
    mode,
    apiBaseUrl: apiUrl.toString().replace(/\/$/, ''),
    apiOrigin: apiUrl.origin,
    webPublicBaseUrl: withTrailingSlash(webPublicUrl),
    updateBaseUrl: withTrailingSlash(updateUrl),
    windowChrome: windowChrome.data,
    spikeMode,
    allowInsecureLocalhost,
  };
}

export function readDesktopEnvironment(): DesktopEnvironment {
  return parseDesktopEnvironment(process.env);
}

export function readDesktopRendererEnvironment(): { enableMock: string | undefined } {
  return { enableMock: process.env.VITE_ENABLE_MOCK };
}

export function readSpikeUserDataPathValue(): string | undefined {
  return process.env.SPIKE_USER_DATA_PATH;
}

declare const __DESKTOP_BUILD_ENV__: DesktopEnvironment | undefined;

export function getDesktopEnvironment(): DesktopEnvironment {
  if (typeof __DESKTOP_BUILD_ENV__ !== 'undefined') return __DESKTOP_BUILD_ENV__;
  return readDesktopEnvironment();
}

export function readRendererDevelopmentUrl(): string | null {
  const value = process.env.ELECTRON_RENDERER_URL;
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('ELECTRON_RENDERER_URL 必须使用 HTTP 或 HTTPS');
  }
  return url.toString();
}
