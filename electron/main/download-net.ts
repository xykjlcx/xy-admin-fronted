import { net, type IncomingMessage } from 'electron';
import type { DownloadRequestInput, DownloadResponse } from './download-manager';

function normalizeHeaders(headers: Record<string, string | string[]>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name.toLowerCase(),
      Array.isArray(value) ? value.join(', ') : value,
    ]),
  );
}

function createBody(
  response: IncomingMessage,
  signal: AbortSignal,
  abortRequest: () => void,
): AsyncIterable<Uint8Array> {
  const queue: Buffer[] = [];
  const waiters: Array<() => void> = [];
  let ended = false;
  let failure: Error | null = null;
  const wake = () => waiters.splice(0).forEach((resolve) => resolve());
  const onData = (chunk: Buffer) => {
    queue.push(chunk);
    wake();
  };
  const onEnd = () => {
    ended = true;
    wake();
  };
  const onError = (error: Error) => {
    failure = error;
    ended = true;
    wake();
  };
  const onAbort = () => abortRequest();

  response.on('data', onData);
  response.once('end', onEnd);
  response.once('aborted', onEnd);
  response.once('error', onError);
  signal.addEventListener('abort', onAbort, { once: true });

  const cleanup = () => {
    response.removeListener('data', onData);
    response.removeListener('end', onEnd);
    response.removeListener('aborted', onEnd);
    response.removeListener('error', onError);
    signal.removeEventListener('abort', onAbort);
  };

  return {
    async *[Symbol.asyncIterator]() {
      try {
        while (!ended || queue.length > 0) {
          const chunk = queue.shift();
          if (chunk) {
            yield chunk;
            continue;
          }
          await new Promise<void>((resolve) => waiters.push(resolve));
        }
        if (failure) throw failure;
      } finally {
        cleanup();
      }
    },
  };
}

async function* emptyBody(): AsyncIterable<Uint8Array> {
  return;
}

export function requestDownloadWithElectronNet(input: DownloadRequestInput): Promise<DownloadResponse> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      url: input.url,
      method: 'GET',
      headers: input.headers,
      redirect: 'manual',
      credentials: 'omit',
      useSessionCookies: false,
      cache: 'no-store',
    });
    let settled = false;
    const abort = () => request.abort();
    const removeRequestAbortListener = () => input.signal.removeEventListener('abort', abort);
    const rejectAborted = () => {
      if (settled) return;
      settled = true;
      removeRequestAbortListener();
      reject(new DOMException('Download cancelled', 'AbortError'));
    };
    const settle = (response: DownloadResponse) => {
      if (settled) return;
      settled = true;
      removeRequestAbortListener();
      resolve(response);
    };
    request.once('redirect', (statusCode, _method, redirectUrl, responseHeaders) => {
      settle({
        statusCode,
        headers: { ...normalizeHeaders(responseHeaders), location: redirectUrl },
        body: emptyBody(),
        dispose: abort,
      });
    });
    request.once('response', (response) => {
      settle({
        statusCode: response.statusCode,
        headers: normalizeHeaders(response.headers),
        body: createBody(response, input.signal, abort),
        dispose: abort,
      });
    });
    request.once('error', (error) => {
      if (!settled) {
        settled = true;
        removeRequestAbortListener();
        reject(error);
      }
    });
    request.once('abort', rejectAborted);
    if (input.signal.aborted) abort();
    else input.signal.addEventListener('abort', abort, { once: true });
    request.end();
  });
}
