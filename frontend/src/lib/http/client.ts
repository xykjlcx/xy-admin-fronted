import { z } from 'zod';
import { AuthExpiredError, BizError, ContractError, HttpError } from './errors';
import { authEvents } from './events';
import { requestConfig } from '@/config';
import type { ApiContract, BlobResult } from './contract';

const BASE = requestConfig.baseUrl;
const PROBLEM_DETAIL_SCHEMA = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string().optional(),
  code: z.string().regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/),
  traceId: z.string().optional(),
});

let getToken: () => string | null = () => null;
let getLocale: () => string | null = () =>
  document.documentElement.lang || navigator.language || 'zh-CN';
export interface AuthRefreshBinding {
  refresh: (signal: AbortSignal) => Promise<string>;
  commitToken: (token: string) => void;
}

let refreshBinding: AuthRefreshBinding | null = null;
let observedTokenUsed: string | null = null;
let authGeneration = 0;
let authStateInitialized = false;

interface AuthAttempt {
  tokenUsed: string | null;
  generation: number;
}

interface RefreshLatch extends AuthAttempt {
  controller: AbortController;
  promise: Promise<void>;
}

interface ExpiryLatch extends AuthAttempt {
  error: AuthExpiredError;
}

let refreshLatch: RefreshLatch | null = null;
let expiryLatch: ExpiryLatch | null = null;

function currentTokenUsed(): string | null {
  const token = getToken()?.trim();
  return token || null;
}

function resetAuthTracking() {
  refreshLatch?.controller.abort(new DOMException('auth session advanced', 'AbortError'));
  observedTokenUsed = currentTokenUsed();
  authGeneration += 1;
  authStateInitialized = true;
  refreshLatch = null;
  expiryLatch = null;
}

export function bumpAuthSessionEpoch() {
  resetAuthTracking();
}

export function bindTokenGetter(fn: () => string | null) {
  getToken = fn;
  resetAuthTracking();
}

export function bindLocaleGetter(fn: () => string | null) {
  getLocale = fn;
}

// Task 13 在此绑定真实 refresh 与 token 持久化；Task 9 只提供不反向依赖 auth 模块的窄口。
export function bindAuthRefreshHandler(binding: AuthRefreshBinding | null) {
  refreshBinding = binding;
  resetAuthTracking();
}

export interface HttpRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  on401?: 'expire' | 'reject';
}

function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  return search.toString();
}

function createRequestDeadline(options?: HttpRequestOptions) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutMs = options?.timeoutMs ?? requestConfig.timeoutMs;
  const timeoutId = globalThis.setTimeout(() => {
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
      globalThis.clearTimeout(timeoutId);
      options?.signal?.removeEventListener('abort', abortFromCaller);
    },
  };
}

type RequestDeadline = ReturnType<typeof createRequestDeadline>;

function abortError(deadline: RequestDeadline, cause?: unknown): HttpError {
  return new HttpError(0, deadline.didTimeout() ? 'request timeout' : 'request aborted',
    cause === undefined ? undefined : { cause });
}

function raceWithSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const resolveOnce = (value: T) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const onAbort = () => {
      rejectOnce(signal.reason);
    };
    void promise.then(
      (value) => resolveOnce(value),
      (error: unknown) => rejectOnce(error),
    );
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
}

function encodeBody(body: unknown): { body?: BodyInit; contentType?: string } {
  if (body === undefined) return {};
  if (body instanceof FormData) return { body };
  return { body: JSON.stringify(body), contentType: 'application/json' };
}

function currentLocale(): string {
  return getLocale() || 'zh-CN';
}

function parseFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const encoded = contentDisposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i)?.[1];
  const plain = contentDisposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
  const raw = encoded ?? plain?.[1] ?? plain?.[2];
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^"|"$/g, '');
  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) return Number(normalized) * 1_000;
  const date = Date.parse(normalized);
  if (Number.isNaN(date)) return null;
  return Math.max(0, date - Date.now());
}

async function readLimitedText(response: Response, signal: AbortSignal): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytesRead = 0;
  let reachedNaturalEof = false;
  try {
    while (bytesRead < requestConfig.maxErrorBodyBytes) {
      const { done, value } = await raceWithSignal(reader.read(), signal);
      if (done) {
        reachedNaturalEof = true;
        break;
      }
      const remaining = requestConfig.maxErrorBodyBytes - bytesRead;
      const accepted = value.subarray(0, remaining);
      chunks.push(decoder.decode(accepted, { stream: true }));
      bytesRead += accepted.byteLength;
      if (accepted.byteLength < value.byteLength || bytesRead >= requestConfig.maxErrorBodyBytes) {
        await reader.cancel();
        break;
      }
    }
    // 只在真实 EOF 刷新 decoder；被 byte cap 截断时丢弃缓冲的半个 UTF-8 码点。
    if (reachedNaturalEof) chunks.push(decoder.decode());
    return chunks.join('');
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }
}

async function readOwnedBodyParts(response: Response, signal: AbortSignal): Promise<ArrayBuffer[]> {
  if (!response.body) return [];
  const reader = response.body.getReader();
  const parts: ArrayBuffer[] = [];
  let cancelled = false;
  const cancelOnce = async (reason: unknown) => {
    if (cancelled) return;
    cancelled = true;
    await reader.cancel(reason).catch(() => undefined);
  };

  try {
    while (true) {
      const { done, value } = await raceWithSignal(reader.read(), signal);
      if (done) break;
      const ownedPart = new ArrayBuffer(value.byteLength);
      new Uint8Array(ownedPart).set(value);
      parts.push(ownedPart);
    }
  } catch (error) {
    await cancelOnce(error);
    throw error;
  } finally {
    reader.releaseLock();
  }

  return parts;
}

function mergeBodyParts(parts: ArrayBuffer[]): Uint8Array {
  const totalBytes = parts.reduce((total, part) => total + part.byteLength, 0);
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const part of parts) {
    bytes.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  return bytes;
}

async function readAllBodyBytes(response: Response, signal: AbortSignal): Promise<Uint8Array> {
  return mergeBodyParts(await readOwnedBodyParts(response, signal));
}

async function discardOwnedBody(response: Response, signal: AbortSignal): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  try {
    await raceWithSignal(reader.cancel('void response body is ignored'), signal);
  } finally {
    reader.releaseLock();
  }
}

async function decodeError(response: Response, signal: AbortSignal): Promise<BizError> {
  const traceId = response.headers.get(requestConfig.traceHeaderName);
  const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? '';
  const body = await readLimitedText(response, signal);

  if (contentType.includes('json') && body) {
    try {
      const parsed = PROBLEM_DETAIL_SCHEMA.safeParse(JSON.parse(body));
      if (parsed.success) {
        return new BizError({
          status: response.status,
          code: parsed.data.code,
          detail: parsed.data.detail,
          traceId: parsed.data.traceId ?? traceId,
          instance: parsed.data.instance ?? null,
          retryAfter,
        });
      }
    } catch {
      // 非法 JSON 与畸形 ProblemDetail 统一落到安全 transport fallback。
    }
  }

  const summarySource = contentType.includes('text/html') ? body.replace(/<[^>]*>/g, ' ') : body;
  const summary = summarySource
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, requestConfig.maxErrorSummaryChars);
  return new BizError({
    status: response.status,
    code: 'transport.http-error',
    detail: summary || response.statusText || `HTTP ${response.status}`,
    traceId,
    instance: null,
    retryAfter,
  });
}

function canRetryTransport(method: string, retryCount: number): boolean {
  return (
    requestConfig.retryableMethods.includes(method) &&
    retryCount < requestConfig.maxTransportRetries
  );
}

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(signal.reason);
  if (delayMs <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const timeoutId = globalThis.setTimeout(() => {
      cleanup();
      resolve();
    }, delayMs);
    const onAbort = () => {
      globalThis.clearTimeout(timeoutId);
      cleanup();
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function authReplayExcluded(url: string): boolean {
  return requestConfig.authReplayExcludedPaths.some(
    (path) => url === path || url.startsWith(`${path}?`),
  );
}

function observeAuthState(): AuthAttempt {
  const tokenUsed = currentTokenUsed();
  if (!authStateInitialized) {
    observedTokenUsed = tokenUsed;
    authStateInitialized = true;
  } else if (tokenUsed !== observedTokenUsed) {
    observedTokenUsed = tokenUsed;
    authGeneration += 1;
    refreshLatch = null;
    expiryLatch = null;
  }
  return { tokenUsed, generation: authGeneration };
}

function sameAuthAttempt(left: AuthAttempt, right: AuthAttempt): boolean {
  return left.tokenUsed === right.tokenUsed && left.generation === right.generation;
}

function failAuthExpired(failedAttempt: AuthAttempt, cause?: unknown): AuthExpiredError {
  const current = observeAuthState();
  if (!sameAuthAttempt(failedAttempt, current)) {
    return new AuthExpiredError('auth expired', cause === undefined ? undefined : { cause });
  }
  if (expiryLatch && sameAuthAttempt(expiryLatch, failedAttempt)) return expiryLatch.error;
  const error = new AuthExpiredError('auth expired', cause === undefined ? undefined : { cause });
  expiryLatch = { ...failedAttempt, error };
  authEvents.emit('expired');
  return error;
}

function refreshOnce(failedAttempt: AuthAttempt): Promise<void> {
  const current = observeAuthState();
  if (!sameAuthAttempt(failedAttempt, current)) return Promise.resolve();
  if (refreshLatch && sameAuthAttempt(refreshLatch, failedAttempt)) return refreshLatch.promise;
  const binding = refreshBinding;
  const controller = new AbortController();
  const promise = (async () => {
    try {
      if (!binding) throw new Error('auth refresh binding is not configured');
      const returnedToken = await raceWithSignal(binding.refresh(controller.signal), controller.signal);
      const nextToken = returnedToken.trim();
      if (!nextToken) throw new Error('auth refresh returned an empty access token');
      if (controller.signal.aborted || !sameAuthAttempt(failedAttempt, observeAuthState())) {
        throw controller.signal.reason ?? new DOMException('auth session advanced', 'AbortError');
      }
      binding.commitToken(nextToken);
      if (refreshLatch?.controller === controller) refreshLatch = null;
      bumpAuthSessionEpoch();
    } catch (error) {
      if (controller.signal.aborted || !sameAuthAttempt(failedAttempt, observeAuthState())) throw error;
      throw failAuthExpired(failedAttempt, error);
    }
  })();
  refreshLatch = { ...failedAttempt, controller, promise };
  return promise;
}

async function decodeSuccess<T>(
  response: Response,
  method: string,
  url: string,
  contract: ApiContract<T>,
  signal: AbortSignal,
): Promise<T> {
  let raw: unknown;
  if (contract.responseKind === 'void') {
    await discardOwnedBody(response, signal);
    raw = undefined;
  } else if (contract.responseKind === 'blob') {
    const contentType = response.headers.get('Content-Type');
    const parts = await readOwnedBodyParts(response, signal);
    const blob = new Blob(parts, { type: contentType ?? '' });
    const result: BlobResult = {
      blob,
      filename: parseFilename(response.headers.get('Content-Disposition')),
      contentType: contentType ?? (blob.type || null),
    };
    raw = result;
  } else {
    try {
      const bytes = await readAllBodyBytes(response, signal);
      raw = JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      throw new HttpError(response.status, 'invalid json response', { cause: error });
    }
  }

  try {
    return contract.parse(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ContractError(`Response contract failed for ${method} ${url}`, error.issues);
    }
    throw error;
  }
}

async function requestCore<T>(
  method: string,
  url: string,
  body: unknown,
  params: Record<string, unknown> | undefined,
  contract: ApiContract<T>,
  options?: HttpRequestOptions,
): Promise<T> {
  const query = params ? toQueryString(params) : '';
  const target = `${BASE}${url}${query ? `?${query}` : ''}`;
  const encoded = encodeBody(body);
  const originalRequestHadAccessToken = observeAuthState().tokenUsed !== null;
  let retryCount = 0;
  let authReplayCount = 0;
  const deadline = createRequestDeadline(options);

  try {
    if (deadline.signal.aborted) throw deadline.signal.reason;
    while (true) {
      const attemptAuth = observeAuthState();
      let response: Response;
      try {
        response = await raceWithSignal(
          fetch(target, {
            method,
            credentials: requestConfig.credentials,
            headers: {
              Accept:
                contract.responseKind === 'blob'
                  ? '*/*'
                  : 'application/json, application/problem+json',
              'Accept-Language': currentLocale(),
              ...(encoded.contentType ? { 'Content-Type': encoded.contentType } : {}),
              ...(attemptAuth.tokenUsed
                ? {
                    [requestConfig.authHeaderName]:
                      `${requestConfig.authTokenPrefix} ${attemptAuth.tokenUsed}`,
                  }
                : {}),
            },
            body: encoded.body,
            signal: deadline.signal,
          }),
          deadline.signal,
        );
      } catch (error) {
        if (deadline.signal.aborted) throw error;
        if (canRetryTransport(method, retryCount)) {
          retryCount += 1;
          continue;
        }
        throw new HttpError(0, 'network error', { cause: error });
      }

      if (response.ok) {
        const result = await decodeSuccess(response, method, url, contract, deadline.signal);
        if (deadline.signal.aborted) throw abortError(deadline);
        return result;
      }
      const error = await decodeError(response, deadline.signal);
      const refreshable401 =
        response.status === requestConfig.authExpiredStatus &&
        originalRequestHadAccessToken &&
        attemptAuth.tokenUsed !== null &&
        options?.on401 !== 'reject' &&
        !authReplayExcluded(url) &&
        requestConfig.refreshableProblemCodes.includes(error.code);
      if (refreshable401) {
        if (authReplayCount > 0) throw failAuthExpired(attemptAuth, error);
        const currentAuth = observeAuthState();
        if (sameAuthAttempt(attemptAuth, currentAuth)) {
          await raceWithSignal(refreshOnce(attemptAuth), deadline.signal);
        }
        authReplayCount += 1;
        continue;
      }
      if (
        requestConfig.retryableStatuses.includes(response.status) &&
        canRetryTransport(method, retryCount)
      ) {
        retryCount += 1;
        await waitForRetry(error.retryAfter ?? 0, deadline.signal);
        continue;
      }
      throw error;
    }
  } catch (error) {
    if (deadline.signal.aborted) throw abortError(deadline, error);
    throw error;
  } finally {
    deadline.dispose();
  }
}

export const http = {
  get: <T>(
    url: string,
    params: Record<string, unknown> | undefined,
    contract: ApiContract<T>,
    options?: HttpRequestOptions,
  ) => requestCore('GET', url, undefined, params, contract, options),
  head: <T>(
    url: string,
    params: Record<string, unknown> | undefined,
    contract: ApiContract<T>,
    options?: HttpRequestOptions,
  ) => requestCore('HEAD', url, undefined, params, contract, options),
  post: <T>(url: string, body: unknown, contract: ApiContract<T>, options?: HttpRequestOptions) =>
    requestCore('POST', url, body, undefined, contract, options),
  put: <T>(url: string, body: unknown, contract: ApiContract<T>, options?: HttpRequestOptions) =>
    requestCore('PUT', url, body, undefined, contract, options),
  patch: <T>(url: string, body: unknown, contract: ApiContract<T>, options?: HttpRequestOptions) =>
    requestCore('PATCH', url, body, undefined, contract, options),
  del: <T>(url: string, contract: ApiContract<T>, options?: HttpRequestOptions) =>
    requestCore('DELETE', url, undefined, undefined, contract, options),
};
