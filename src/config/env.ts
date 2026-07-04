import { z } from 'zod';

// env.ts 是业务代码读取 import.meta.env 的唯一入口。
// 其他层只消费解析后的配置对象，避免环境变量散落后失去校验和生产剥离能力。
const appEnvSchema = z.enum(['local', 'development', 'test', 'staging', 'production', 'demo']);
const localeSchema = z.enum(['zh-CN', 'en-US']);

export type AppEnvName = z.infer<typeof appEnvSchema>;
export type LocaleCode = z.infer<typeof localeSchema>;

export interface ParsedEnv {
  mode: string;
  dev: boolean;
  prod: boolean;
  appEnv: AppEnvName;
  appVersion: string;
  apiBaseUrl: string;
  defaultLocale: LocaleCode;
  requestTimeoutMs: number;
  enableMockOverride: boolean | undefined;
  enableDevtoolsOverride: boolean | undefined;
  enableVisualDebugOverride: boolean | undefined;
}

type RawEnv = Record<string, unknown>;

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return fallback;
}

// Override 必须区分“没配置”和“显式 true/false”。
// 例如开发态默认启 mock，但 VITE_ENABLE_MOCK=false 要能明确关闭。
function parseBooleanOverride(name: string, value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error(`${name} must be "true" or "false"`);
}

function parsePositiveInteger(name: string, value: unknown, fallback: number): number {
  const raw = value === undefined || value === null || value === '' ? fallback : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function parseAppEnv(mode: string, value: unknown): AppEnvName {
  const fallback = mode === 'demo' ? 'demo' : mode === 'production' ? 'production' : 'development';
  const result = appEnvSchema.safeParse(value || fallback);
  if (!result.success) throw new Error('VITE_APP_ENV must be local/development/test/staging/production/demo');
  return result.data;
}

function parseLocale(value: unknown): LocaleCode {
  const result = localeSchema.safeParse(value || 'zh-CN');
  if (!result.success) throw new Error('VITE_DEFAULT_LOCALE must be zh-CN or en-US');
  return result.data;
}

export function parseEnv(input: RawEnv): ParsedEnv {
  const mode = String(input.MODE || 'development');

  return {
    mode,
    dev: parseBoolean(input.DEV, mode !== 'production'),
    prod: parseBoolean(input.PROD, mode === 'production'),
    appEnv: parseAppEnv(mode, input.VITE_APP_ENV),
    appVersion: String(input.VITE_APP_VERSION || '0.1.0'),
    apiBaseUrl: String(input.VITE_API_BASE_URL || ''),
    defaultLocale: parseLocale(input.VITE_DEFAULT_LOCALE),
    requestTimeoutMs: parsePositiveInteger('VITE_REQUEST_TIMEOUT_MS', input.VITE_REQUEST_TIMEOUT_MS, 15000),
    enableMockOverride: parseBooleanOverride('VITE_ENABLE_MOCK', input.VITE_ENABLE_MOCK),
    enableDevtoolsOverride: parseBooleanOverride('VITE_ENABLE_DEVTOOLS', input.VITE_ENABLE_DEVTOOLS),
    enableVisualDebugOverride: parseBooleanOverride('VITE_ENABLE_VISUAL_DEBUG', input.VITE_ENABLE_VISUAL_DEBUG),
  };
}

export const env = parseEnv(import.meta.env);

// 入口 mock worker 开关必须保留为 import.meta.env 直连表达式。
// 如果这里改成读取 featuresConfig.enableMock，Vite 无法静态推断，生产包可能重新带上 MSW/faker chunk。
export const shouldStartMockWorker =
  import.meta.env.VITE_ENABLE_MOCK === 'true' ||
  import.meta.env.MODE === 'demo' ||
  (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCK !== 'false');

export async function startMockWorkerIfEnabled(): Promise<boolean> {
  if (!shouldStartMockWorker) return false;

  const { enableMocking } = await import('@/mocks/browser');
  await enableMocking();
  return true;
}
