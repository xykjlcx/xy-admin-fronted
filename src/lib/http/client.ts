import { adapter } from './adapter';
import { BizError, AuthExpiredError, ContractError, HttpError } from './errors';
import { authEvents } from './events';
import { requestConfig } from '@/config';
import type { ApiContract } from './contract';

const BASE = requestConfig.baseUrl;
let getToken: () => string | null = () => null;

// HTTP 层不直接 import auth store，避免基础库反向依赖业务状态。
// auth.api.ts 在模块加载时绑定 token getter，后续若换认证实现，只改绑定点。
export function bindTokenGetter(fn: () => string | null) {
  getToken = fn;
}

export interface HttpRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function toQueryString(params: Record<string, unknown>): string {
  const mapped = adapter.mapRequestParams(params);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(mapped)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  return search.toString();
}

function abortErrorMessage(error: unknown, timedOut: boolean): string | null {
  if (timedOut) return 'request timeout';
  if (error instanceof DOMException && error.name === 'AbortError') return 'request aborted';
  if (error instanceof Error && error.name === 'AbortError') return 'request aborted';
  return null;
}

function createAbortController(options?: HttpRequestOptions) {
  // 统一把“全局超时”和“调用方主动取消”合并成 fetch 的一个 signal。
  // dispose 必须清 timer 和 listener，否则表格快速切页/卸载时会积累无效回调。
  const controller = new AbortController();
  let timedOut = false;
  const timeoutMs = options?.timeoutMs ?? requestConfig.timeoutMs;
  const timeoutId = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromCaller = () => controller.abort();

  if (options?.signal?.aborted) controller.abort();
  else options?.signal?.addEventListener('abort', abortFromCaller, { once: true });

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      window.clearTimeout(timeoutId);
      options?.signal?.removeEventListener('abort', abortFromCaller);
    },
  };
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  params?: Record<string, unknown>,
  contract?: ApiContract<T>,
  options?: HttpRequestOptions,
): Promise<T> {
  const qs = params ? toQueryString(params) : '';
  const token = getToken();
  const abort = createAbortController(options);
  let res: Response;
  try {
    res = await fetch(`${BASE}${url}${qs ? `?${qs}` : ''}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token
          ? { [requestConfig.authHeaderName]: `${requestConfig.authTokenPrefix} ${token}` }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abort.signal,
    });
  } catch (e) {
    const message = abortErrorMessage(e, abort.didTimeout());
    if (message) throw new HttpError(0, message, { cause: e });
    throw new HttpError(0, 'network error', { cause: e });
  } finally {
    abort.dispose();
  }
  if (res.status === requestConfig.authExpiredStatus) {
    // 401 是全局身份事件，不在具体页面里各自处理；mount.tsx 订阅后统一清状态并跳登录。
    authEvents.emit('expired');
    throw new AuthExpiredError('登录已过期');
  }
  if (!res.ok) throw new HttpError(res.status, res.statusText);
  let raw: unknown;
  try {
    raw = await res.json();
  } catch (e) {
    throw new HttpError(res.status, 'invalid json response', { cause: e });
  }
  const env = adapter.parseEnvelope<T>(raw);
  if (typeof env.code !== 'number') throw new HttpError(res.status, 'unexpected response shape');
  if (!requestConfig.successCodes.includes(env.code)) throw new BizError(env.code, env.message);
  if (!contract) return env.data;
  // TypeScript 只能约束前端编译期，不能证明后端或 mock 实际返回 shape。
  // 所有关键接口在这里做运行时契约校验，字段漂移时尽早失败，而不是让页面静默渲染错数据。
  const result = contract.response.safeParse(env.data);
  if (!result.success) {
    throw new ContractError(`Response contract failed for ${method} ${url}`, result.error.issues);
  }
  return result.data as T;
}
export const http = {
  get: <T>(
    url: string,
    params?: Record<string, unknown>,
    contract?: ApiContract<T>,
    options?: HttpRequestOptions,
  ) => request<T>('GET', url, undefined, params, contract, options),
  post: <T>(url: string, body?: unknown, contract?: ApiContract<T>, options?: HttpRequestOptions) =>
    request<T>('POST', url, body, undefined, contract, options),
  put: <T>(url: string, body?: unknown, contract?: ApiContract<T>, options?: HttpRequestOptions) =>
    request<T>('PUT', url, body, undefined, contract, options),
  patch: <T>(url: string, body?: unknown, contract?: ApiContract<T>, options?: HttpRequestOptions) =>
    request<T>('PATCH', url, body, undefined, contract, options),
  del: <T>(url: string, contract?: ApiContract<T>, options?: HttpRequestOptions) =>
    request<T>('DELETE', url, undefined, undefined, contract, options),
};
