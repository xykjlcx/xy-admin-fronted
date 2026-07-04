import { env, type ParsedEnv } from './env';

// requestConfig 只描述后端协议的稳定约定，真正的请求流程在 lib/http/client.ts。
// 将 header、超时、成功码和 envelope key 集中在这里，后续换后端方言时不用扫页面代码。
export function createRequestConfig(source: ParsedEnv) {
  return {
    baseUrl: source.apiBaseUrl,
    timeoutMs: source.requestTimeoutMs,
    authHeaderName: 'Authorization',
    authTokenPrefix: 'Bearer',
    authExpiredStatus: 401,
    successCodes: [0],
    envelope: { code: 'code', data: 'data', message: 'message' },
  };
}

export const requestConfig = createRequestConfig(env);
