import { adapter } from './adapter';
import { BizError, AuthExpiredError, HttpError } from './errors';
import { authEvents } from './events';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
let getToken: () => string | null = () => null;
export function bindTokenGetter(fn: () => string | null) {
  getToken = fn;
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

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
  params?: Record<string, unknown>,
): Promise<T> {
  const qs = params ? toQueryString(params) : '';
  const token = getToken();
  const res = await fetch(`${BASE}${url}${qs ? `?${qs}` : ''}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    authEvents.emit('expired');
    throw new AuthExpiredError('登录已过期');
  }
  if (!res.ok) throw new HttpError(res.status, res.statusText);
  const env = adapter.parseEnvelope<T>(await res.json());
  if (!adapter.isOk(env.code)) throw new BizError(env.code, env.message);
  return env.data;
}
export const http = {
  get: <T>(url: string, params?: Record<string, unknown>) => request<T>('GET', url, undefined, params),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body),
  del: <T>(url: string) => request<T>('DELETE', url),
};
