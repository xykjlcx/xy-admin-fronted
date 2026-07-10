import { randomUUID } from 'node:crypto';
import { open, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import type {
  FileDownloadErrorCode,
  FileDownloadEvent,
  FileDownloadStartInput,
  FileDownloadStartResult,
} from '../shared/schemas';

const maximumRedirects = 5;
const maximumFilenameLength = 180;
const reservedWindowsName = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i;

export interface DownloadResponse {
  statusCode: number;
  headers: Record<string, string | undefined>;
  body: AsyncIterable<Uint8Array>;
  dispose(): void;
}

export interface DownloadRequestInput {
  url: string;
  headers: Record<string, string>;
  signal: AbortSignal;
}

interface DownloadManagerDependencies {
  apiBaseUrl: string;
  approvedOrigins: ReadonlySet<string>;
  allowInsecureApi: boolean;
  restoreCredential(): Promise<string | null>;
  showSaveDialog(suggestedName: string): Promise<string | null>;
  request(input: DownloadRequestInput): Promise<DownloadResponse>;
  availableBytes(directory: string): Promise<number>;
  emit(event: FileDownloadEvent): void;
  createTaskId?: () => string;
}

interface RedirectInput {
  currentUrl: string;
  location: string;
  apiOrigin: string;
  approvedOrigins: ReadonlySet<string>;
  authorizationAllowed: boolean;
  visitedUrls: ReadonlySet<string>;
  redirectCount: number;
  allowInsecureApi?: boolean;
}

interface RedirectResult {
  url: string;
  authorizationAllowed: boolean;
  redirectCount: number;
}

class DownloadFailure extends Error {
  readonly code: FileDownloadErrorCode;

  constructor(code: FileDownloadErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DownloadFailure';
    this.code = code;
  }
}

function fail(code: FileDownloadErrorCode, message: string): never {
  throw new DownloadFailure(code, `${code}: ${message}`);
}

function boundedFilename(value: string): string {
  if (value.length <= maximumFilenameLength) return value;
  const extensionIndex = value.lastIndexOf('.');
  const candidateExtension = extensionIndex > 0 ? value.slice(extensionIndex) : '';
  const extension = candidateExtension.length <= 20 ? candidateExtension : '';
  const maximumStemLength = Math.max(1, maximumFilenameLength - extension.length);
  return `${value.slice(0, maximumStemLength)}${extension}`;
}

export function sanitizeSuggestedFilename(value: string): string {
  const segment = value.normalize('NFC').split(/[\\/]/).at(-1) ?? '';
  const sanitized = segment
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .replace(/[. ]+$/g, '');
  const fallback = sanitized.replace(/^_+$/, '') ? sanitized : 'download';
  return boundedFilename(reservedWindowsName.test(fallback) ? `_${fallback}` : fallback);
}

function assertApprovedUrl(
  url: URL,
  apiOrigin: string,
  approvedOrigins: ReadonlySet<string>,
  allowInsecureApi: boolean,
): void {
  const isAllowedApiHttp = allowInsecureApi && url.protocol === 'http:' && url.origin === apiOrigin;
  if (url.protocol !== 'https:' && !isAllowedApiHttp) {
    fail('UNSAFE_REDIRECT', '下载只允许 HTTPS，开发态 API localhost 除外');
  }
  if (url.username || url.password) fail('UNSAFE_REDIRECT', '下载 URL 禁止包含凭据');
  if (!approvedOrigins.has(url.origin)) fail('UNAPPROVED_ORIGIN', '下载 origin 未批准');
}

export function resolveDownloadRedirect(input: RedirectInput): RedirectResult {
  if (input.redirectCount >= maximumRedirects) fail('TOO_MANY_REDIRECTS', '重定向超过 5 次');
  let next: URL;
  try {
    next = new URL(input.location, input.currentUrl);
  } catch (error) {
    throw new DownloadFailure('UNSAFE_REDIRECT', '重定向地址无效', { cause: error });
  }
  assertApprovedUrl(next, input.apiOrigin, input.approvedOrigins, input.allowInsecureApi ?? false);
  const normalized = next.toString();
  if (input.visitedUrls.has(normalized)) fail('REDIRECT_LOOP', '检测到下载重定向循环');
  return {
    url: normalized,
    authorizationAllowed: input.authorizationAllowed && next.origin === new URL(input.currentUrl).origin,
    redirectCount: input.redirectCount + 1,
  };
}

function headerValue(headers: Record<string, string | undefined>, name: string): string | undefined {
  const target = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === target);
  return entry?.[1];
}

function parseContentLength(headers: Record<string, string | undefined>): number {
  const value = headerValue(headers, 'content-length');
  if (value === undefined) fail('MISSING_CONTENT_LENGTH', '下载响应缺少 Content-Length');
  if (!/^\d+$/.test(value)) fail('INVALID_CONTENT_LENGTH', 'Content-Length 必须是非负整数');
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) fail('INVALID_CONTENT_LENGTH', 'Content-Length 超出安全范围');
  return parsed;
}

function isRedirect(statusCode: number): boolean {
  return [301, 302, 303, 307, 308].includes(statusCode);
}

function errorEvent(taskId: string, error: unknown): FileDownloadEvent {
  if (error instanceof DownloadFailure) {
    return { taskId, status: 'error', code: error.code, message: error.message };
  }
  if (error instanceof Error && /ENOSPC/.test(error.message)) {
    return { taskId, status: 'error', code: 'INSUFFICIENT_DISK', message: '磁盘空间不足' };
  }
  if (error instanceof Error) {
    return { taskId, status: 'error', code: 'FILE_SYSTEM_ERROR', message: '下载文件写入失败' };
  }
  return { taskId, status: 'error', code: 'UNKNOWN_ERROR', message: '未知下载错误' };
}

function progressEvent(
  taskId: string,
  receivedBytes: number,
  totalBytes: number,
): Extract<FileDownloadEvent, { status: 'progress' }> {
  const percent = totalBytes === 0 ? 100 : Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
  return { taskId, status: 'progress', receivedBytes, totalBytes, percent };
}

async function writeChunk(file: Awaited<ReturnType<typeof open>>, chunk: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < chunk.byteLength) {
    const { bytesWritten } = await file.write(chunk, offset, chunk.byteLength - offset);
    if (bytesWritten <= 0) fail('FILE_SYSTEM_ERROR', '文件写入未取得进展');
    offset += bytesWritten;
  }
}

export function createDownloadManager(dependencies: DownloadManagerDependencies) {
  const active = new Map<string, AbortController>();
  const apiUrl = new URL(dependencies.apiBaseUrl);
  const approvedOrigins = new Set(dependencies.approvedOrigins);
  approvedOrigins.add(apiUrl.origin);

  async function execute(taskId: string, input: FileDownloadStartInput, controller: AbortController) {
    const filename = sanitizeSuggestedFilename(input.suggestedName);
    let targetPath: string | null = null;
    let temporaryPath: string | null = null;
    try {
      targetPath = await dependencies.showSaveDialog(filename);
      if (!targetPath || controller.signal.aborted) {
        dependencies.emit({ taskId, status: 'cancelled' });
        return;
      }
      temporaryPath = path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${taskId}.part`);
      const token = await dependencies.restoreCredential();
      let currentUrl = new URL(
        `${apiUrl.pathname.replace(/\/$/, '')}/api/files/${encodeURIComponent(input.resourceId)}/download`,
        apiUrl.origin,
      ).toString();
      let authorizationAllowed = true;
      let redirectCount = 0;
      const visitedUrls = new Set<string>();

      let finalResponse: DownloadResponse | null = null;
      while (!finalResponse) {
        const parsedCurrentUrl = new URL(currentUrl);
        assertApprovedUrl(parsedCurrentUrl, apiUrl.origin, approvedOrigins, dependencies.allowInsecureApi);
        if (visitedUrls.has(currentUrl)) fail('REDIRECT_LOOP', '检测到下载重定向循环');
        visitedUrls.add(currentUrl);
        let result: DownloadResponse;
        try {
          result = await dependencies.request({
            url: currentUrl,
            headers: {
              'Accept-Encoding': 'identity',
              ...(token && authorizationAllowed && parsedCurrentUrl.origin === apiUrl.origin
                ? { Authorization: `Bearer ${token}` }
                : {}),
            },
            signal: controller.signal,
          });
        } catch (error) {
          if (controller.signal.aborted) throw error;
          throw new DownloadFailure('NETWORK_ERROR', '下载网络请求失败', { cause: error });
        }

        if (isRedirect(result.statusCode)) {
          const location = headerValue(result.headers, 'location');
          result.dispose();
          if (!location) fail('UNSAFE_REDIRECT', '重定向响应缺少 Location');
          const next = resolveDownloadRedirect({
            currentUrl,
            location,
            apiOrigin: apiUrl.origin,
            approvedOrigins,
            authorizationAllowed,
            visitedUrls,
            redirectCount,
            allowInsecureApi: dependencies.allowInsecureApi,
          });
          currentUrl = next.url;
          authorizationAllowed = next.authorizationAllowed;
          redirectCount = next.redirectCount;
          continue;
        }
        if (result.statusCode < 200 || result.statusCode >= 300) {
          result.dispose();
          fail('HTTP_ERROR', `下载请求失败（HTTP ${String(result.statusCode)}）`);
        }
        finalResponse = result;
      }

      try {
        const totalBytes = parseContentLength(finalResponse.headers);
        const freeBytes = await dependencies.availableBytes(path.dirname(targetPath));
        if (freeBytes < totalBytes) fail('INSUFFICIENT_DISK', '磁盘剩余空间不足');

        const file = await open(temporaryPath, 'wx');
        let receivedBytes = 0;
        let lastPercent = -1;
        const emitProgress = () => {
          const event = progressEvent(taskId, receivedBytes, totalBytes);
          if (event.percent === lastPercent) return;
          lastPercent = event.percent;
          dependencies.emit(event);
        };
        emitProgress();
        try {
          for await (const chunk of finalResponse.body) {
            if (controller.signal.aborted) throw new DOMException('Download cancelled', 'AbortError');
            receivedBytes += chunk.byteLength;
            if (receivedBytes > totalBytes) {
              fail('CONTENT_LENGTH_MISMATCH', '接收数据超过 Content-Length');
            }
            await writeChunk(file, chunk);
            emitProgress();
          }
        } finally {
          await file.close();
        }
        if (controller.signal.aborted) throw new DOMException('Download cancelled', 'AbortError');
        if (receivedBytes !== totalBytes) {
          fail('CONTENT_LENGTH_MISMATCH', '实际下载长度与 Content-Length 不一致');
        }
        await rename(temporaryPath, targetPath);
        temporaryPath = null;
        dependencies.emit({ taskId, status: 'completed', filename, bytes: receivedBytes });
      } finally {
        finalResponse.dispose();
      }
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        dependencies.emit({ taskId, status: 'cancelled' });
      } else {
        dependencies.emit(errorEvent(taskId, error));
      }
    } finally {
      if (temporaryPath) await rm(temporaryPath, { force: true }).catch(() => undefined);
      active.delete(taskId);
    }
  }

  return {
    start(input: FileDownloadStartInput): FileDownloadStartResult {
      const taskId = (dependencies.createTaskId ?? randomUUID)();
      const controller = new AbortController();
      active.set(taskId, controller);
      setImmediate(() => void execute(taskId, input, controller));
      return { taskId };
    },
    cancel(taskId: string): boolean {
      const controller = active.get(taskId);
      if (!controller) return false;
      controller.abort();
      return true;
    },
  };
}
