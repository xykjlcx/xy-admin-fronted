import { env, type ParsedEnv } from './env';

// requestConfig 只描述后端协议的稳定约定，真正的请求流程在 lib/http/client.ts。
export function createRequestConfig(source: ParsedEnv) {
  return {
    baseUrl: source.apiBaseUrl,
    timeoutMs: source.requestTimeoutMs,
    authHeaderName: 'Authorization',
    authTokenPrefix: 'Bearer',
    authExpiredStatus: 401,
    traceHeaderName: 'X-Trace-Id',
    credentials: 'same-origin' as const,
    refreshableProblemCodes: ['auth.token.expired'],
    authReplayExcludedPaths: [
      '/api/auth/login',
      '/api/auth/sms-login',
      '/api/auth/qr-login',
      '/api/auth/refresh',
    ],
    retryableMethods: ['GET', 'HEAD'],
    retryableStatuses: [408, 429, 502, 503, 504],
    maxTransportRetries: 1,
    maxErrorBodyBytes: 64 * 1024,
    maxErrorSummaryChars: 512,
  };
}

export const requestConfig = createRequestConfig(env);
