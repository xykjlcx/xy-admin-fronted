import {
  bindAuthRefreshHandler,
  bindTokenGetter,
  http,
} from '@/lib/http/client';
import { AuthExpiredError, BizError, ContractError, HttpError } from '@/lib/http/errors';
import { authEvents } from '@/lib/http/events';
import {
  blobContract,
  defineApiContract,
  defineVoidContract,
} from '@/lib/http/contract';
import { setupServer } from 'msw/node';
import { http as mswHttp, HttpResponse } from 'msw';
import { z } from 'zod';
import { requestConfig } from '@/config';

const anyContract = defineApiContract({ response: z.unknown() });
const idContract = defineApiContract({ response: z.object({ id: z.number() }) });
const voidContract = defineVoidContract();

function bindRefreshForTest(
  refresh: (signal: AbortSignal) => Promise<string>,
  commitToken: (token: string) => void = () => undefined,
) {
  bindAuthRefreshHandler({ refresh, commitToken });
}

const server = setupServer(
  mswHttp.get('/api/json', () => HttpResponse.json({ id: 1 })),
  mswHttp.get('/api/json-invalid-contract', () => HttpResponse.json({ id: '1' })),
  mswHttp.get('/api/empty-200', () => new HttpResponse(null, { status: 200 })),
  mswHttp.delete('/api/no-content', () => new HttpResponse(null, { status: 204 })),
  mswHttp.post('/api/reset-content', () => new HttpResponse(null, { status: 205 })),
  mswHttp.get('/api/export', () =>
    new HttpResponse('id,name\n1,Ada', {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': "attachment; filename*=UTF-8''report%20%E6%9C%88%E5%BA%A6.csv",
      },
    }),
  ),
  mswHttp.post('/api/upload', ({ request }) => {
    return HttpResponse.json({
      contentType: request.headers.get('Content-Type'),
    });
  }),
  mswHttp.get('/api/problem', () =>
    HttpResponse.json(
      {
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        detail: '无权执行此操作',
        instance: '/api/problem',
        code: 'auth.permission.denied',
        traceId: 'problem-trace',
      },
      { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
    ),
  ),
  mswHttp.get('/api/html-error', () =>
    new HttpResponse('<html><body>Bad gateway secret diagnostics</body></html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html', 'X-Trace-Id': 'proxy-trace' },
    }),
  ),
  mswHttp.get('/api/malformed-problem', () =>
    HttpResponse.json(
      { status: 409, detail: 'missing stable code' },
      {
        status: 409,
        headers: { 'Content-Type': 'application/problem+json', 'X-Trace-Id': 'fallback-trace' },
      },
    ),
  ),
  mswHttp.get(
    '/api/invalid-json',
    () => new HttpResponse('not json', { headers: { 'Content-Type': 'application/json' } }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  bindTokenGetter(() => null);
  bindAuthRefreshHandler(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
afterAll(() => server.close());

describe('response decoders and body encoder', () => {
  test('JSON success is the direct object and is validated by zod', async () => {
    await expect(http.get('/api/json', undefined, idContract)).resolves.toEqual({ id: 1 });
    await expect(http.get('/api/json-invalid-contract', undefined, idContract)).rejects.toThrow(
      ContractError,
    );
  });

  test.each([
    ['204', () => http.del('/api/no-content', voidContract)],
    ['205', () => http.post('/api/reset-content', undefined, voidContract)],
    ['empty 200', () => http.get('/api/empty-200', undefined, voidContract)],
  ])('%s void response resolves undefined without JSON parsing', async (_label, request) => {
    await expect(request()).resolves.toBeUndefined();
  });

  test.each([200, 205])(
    'void response with status %i cancels an unexpected never-closing body without JSON parsing',
    async (status) => {
      vi.useFakeTimers();
      const cancel = vi.fn();
      const json = vi.spyOn(Response.prototype, 'json');
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        const response = new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"unexpected":true}'));
            },
            cancel,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
        if (status === 205) Object.defineProperty(response, 'status', { value: status });
        return response;
      });

      let outcome: unknown = 'pending';
      const request = http.get('/api/unexpected-void-body', undefined, voidContract, {
        timeoutMs: 5,
      });
      void request.then(
        (value) => {
          outcome = value;
        },
        (error: unknown) => {
          outcome = error;
        },
      );

      try {
        await vi.advanceTimersByTimeAsync(5);
        expect(outcome).toBeUndefined();
        expect(json).not.toHaveBeenCalled();
        expect(cancel).toHaveBeenCalledOnce();
      } finally {
        vi.useRealTimers();
      }
    },
  );

  test('blob response preserves the Blob, decoded filename, and content type', async () => {
    const result = await http.get('/api/export', undefined, blobContract);

    expect(await result.blob.text()).toBe('id,name\n1,Ada');
    expect(result.filename).toBe('report 月度.csv');
    expect(result.contentType).toBe('text/csv;charset=utf-8');
  });

  test('FormData is sent without an explicit Content-Type so fetch creates the boundary', async () => {
    const form = new FormData();
    form.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }));
    const result = await http.post(
      '/api/upload',
      form,
      defineApiContract({
        response: z.object({ contentType: z.string() }),
      }),
    );

    expect(result.contentType).toMatch(/^multipart\/form-data; boundary=/);
  });

  test('HEAD uses the same core and resolves an explicit void contract', async () => {
    let calls = 0;
    server.use(
      mswHttp.head('/api/health', () => {
        calls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(http.head('/api/health', undefined, voidContract)).resolves.toBeUndefined();
    expect(calls).toBe(1);
  });
});

describe('HTTP error decoding', () => {
  test('valid ProblemDetail becomes BizError with complete HTTP metadata', async () => {
    const error = await http.get('/api/problem', undefined, anyContract).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(BizError);
    if (!(error instanceof BizError)) throw new Error('expected BizError');
    expect(error).toMatchObject({
      status: 403,
      code: 'auth.permission.denied',
      detail: '无权执行此操作',
      traceId: 'problem-trace',
      instance: '/api/problem',
      retryAfter: null,
    });
  });

  test('HTML 502 falls back to transport.http-error and preserves trace header plus safe summary', async () => {
    const error = await http
      .get('/api/html-error', undefined, anyContract)
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(BizError);
    if (!(error instanceof BizError)) throw new Error('expected BizError');
    expect(error).toMatchObject({
      status: 502,
      code: 'transport.http-error',
      traceId: 'proxy-trace',
    });
    expect(error.detail).toContain('Bad gateway');
    expect(error.detail).not.toContain('<html>');
    expect(error.detail.length).toBeLessThanOrEqual(512);
  });

  test('malformed application/problem+json also uses the safe HTTP fallback', async () => {
    await expect(http.get('/api/malformed-problem', undefined, anyContract)).rejects.toMatchObject({
      status: 409,
      code: 'transport.http-error',
      traceId: 'fallback-trace',
    });
  });

  test('invalid success JSON is a stable transport error', async () => {
    await expect(http.get('/api/invalid-json', undefined, anyContract)).rejects.toMatchObject({
      status: 200,
      message: 'invalid json response',
    });
    await expect(http.get('/api/invalid-json', undefined, anyContract)).rejects.toBeInstanceOf(HttpError);
  });

  test('64KiB truncation drops a buffered partial UTF-8 code point without U+FFFD', async () => {
    const cap = requestConfig.maxErrorBodyBytes;
    const originalSummaryLimit = requestConfig.maxErrorSummaryChars;
    requestConfig.maxErrorSummaryChars = cap;
    const prefixAndPartial = new Uint8Array(cap);
    prefixAndPartial.fill(0x61);
    prefixAndPartial[cap - 1] = 0xe2;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(prefixAndPartial);
            controller.enqueue(Uint8Array.from([0x82, 0xac]));
          },
        }),
        { status: 400, headers: { 'Content-Type': 'text/plain' } },
      ),
    );

    try {
      const error = await http.post('/api/utf8-cap-partial', {}, anyContract).catch((value: unknown) => value);
      if (!(error instanceof BizError)) throw new Error('expected BizError');
      expect(error.detail).not.toContain('\uFFFD');
      expect(error.detail).toHaveLength(cap - 1);
    } finally {
      requestConfig.maxErrorSummaryChars = originalSummaryLimit;
    }
  });

  test('a UTF-8 code point split across chunks is preserved when it ends exactly at 64KiB', async () => {
    const cap = requestConfig.maxErrorBodyBytes;
    const originalSummaryLimit = requestConfig.maxErrorSummaryChars;
    requestConfig.maxErrorSummaryChars = cap;
    const prefixAndLead = new Uint8Array(cap - 2);
    prefixAndLead.fill(0x62);
    prefixAndLead[cap - 3] = 0xe2;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(prefixAndLead);
            controller.enqueue(Uint8Array.from([0x82, 0xac]));
            controller.close();
          },
        }),
        { status: 400, headers: { 'Content-Type': 'text/plain' } },
      ),
    );

    try {
      const error = await http.post('/api/utf8-cap-exact', {}, anyContract).catch((value: unknown) => value);
      if (!(error instanceof BizError)) throw new Error('expected BizError');
      expect(error.detail).not.toContain('\uFFFD');
      expect(error.detail.endsWith('€')).toBe(true);
      expect(error.detail).toHaveLength(cap - 2);
    } finally {
      requestConfig.maxErrorSummaryChars = originalSummaryLimit;
    }
  });
});

describe('abort, timeout, and bounded transport retry', () => {
  test('caller abort and timeout are stable transport errors and are not retried', async () => {
    let calls = 0;
    server.use(
      mswHttp.get('/api/slow', async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({ id: 1 });
      }),
    );

    await expect(
      http.get('/api/slow', undefined, idContract, { timeoutMs: 1 }),
    ).rejects.toMatchObject({ status: 0, message: 'request timeout' });

    const controller = new AbortController();
    controller.abort();
    await expect(
      http.get('/api/slow', undefined, idContract, { signal: controller.signal }),
    ).rejects.toMatchObject({ status: 0, message: 'request aborted' });
    expect(calls).toBeLessThanOrEqual(1);
  });

  test('GET retries one network failure and one retryable HTTP status at most', async () => {
    let networkCalls = 0;
    let statusCalls = 0;
    server.use(
      mswHttp.get('/api/network-retry', () => {
        networkCalls += 1;
        return networkCalls === 1 ? HttpResponse.error() : HttpResponse.json({ id: 2 });
      }),
      mswHttp.get('/api/status-retry', () => {
        statusCalls += 1;
        return statusCalls === 1
          ? HttpResponse.json(
              { status: 503, code: 'service.temporarily-unavailable', detail: 'retry' },
              { status: 503, headers: { 'Content-Type': 'application/problem+json' } },
            )
          : HttpResponse.json({ id: 3 });
      }),
    );

    await expect(http.get('/api/network-retry', undefined, idContract)).resolves.toEqual({ id: 2 });
    await expect(http.get('/api/status-retry', undefined, idContract)).resolves.toEqual({ id: 3 });
    expect(networkCalls).toBe(2);
    expect(statusCalls).toBe(2);
  });

  test('Retry-After delta-seconds and HTTP-date are normalized to milliseconds', async () => {
    const retryDate = new Date(Date.now() + 5_000).toUTCString();
    server.use(
      mswHttp.post('/api/retry-after-delta', () =>
        HttpResponse.json(
          { status: 429, code: 'request.rate-limited', detail: 'slow down' },
          {
            status: 429,
            headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '2' },
          },
        ),
      ),
      mswHttp.post('/api/retry-after-date', () =>
        HttpResponse.json(
          { status: 429, code: 'request.rate-limited', detail: 'slow down' },
          {
            status: 429,
            headers: { 'Content-Type': 'application/problem+json', 'Retry-After': retryDate },
          },
        ),
      ),
    );

    await expect(
      http.post('/api/retry-after-delta', undefined, anyContract),
    ).rejects.toMatchObject({ retryAfter: 2_000 });
    const dateError = await http
      .post('/api/retry-after-date', undefined, anyContract)
      .catch((value: unknown) => value);
    if (!(dateError instanceof BizError)) throw new Error('expected BizError');
    expect(dateError.retryAfter).toBeGreaterThanOrEqual(3_000);
    expect(dateError.retryAfter).toBeLessThanOrEqual(5_000);
  });

  test('GET honors Retry-After before replaying', async () => {
    let calls = 0;
    server.use(
      mswHttp.get('/api/rate-limited-once', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { status: 429, code: 'request.rate-limited', detail: 'slow down' },
              {
                status: 429,
                headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '0' },
              },
            )
          : HttpResponse.json({ id: 4 });
      }),
    );

    await expect(http.get('/api/rate-limited-once', undefined, idContract)).resolves.toEqual({ id: 4 });
    expect(calls).toBe(2);
  });

  test('mutations, 403, and ordinary 4xx have zero transport retries', async () => {
    let mutationCalls = 0;
    let forbiddenCalls = 0;
    let badRequestCalls = 0;
    server.use(
      mswHttp.post('/api/no-mutation-retry', () => {
        mutationCalls += 1;
        return new HttpResponse(null, { status: 503 });
      }),
      mswHttp.get('/api/no-403-retry', () => {
        forbiddenCalls += 1;
        return new HttpResponse(null, { status: 403 });
      }),
      mswHttp.get('/api/no-400-retry', () => {
        badRequestCalls += 1;
        return HttpResponse.json(
          { status: 400, code: 'request.validation.failed', detail: 'bad input' },
          { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
        );
      }),
    );

    await expect(http.post('/api/no-mutation-retry', {}, anyContract)).rejects.toMatchObject({
      status: 503,
    });
    await expect(http.get('/api/no-403-retry', undefined, anyContract)).rejects.toMatchObject({
      status: 403,
    });
    await expect(http.get('/api/no-400-retry', undefined, anyContract)).rejects.toMatchObject({
      status: 400,
      code: 'request.validation.failed',
    });
    expect(mutationCalls).toBe(1);
    expect(forbiddenCalls).toBe(1);
    expect(badRequestCalls).toBe(1);
  });

  test('the logical timeout remains active while a JSON response body is being read', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      const stream = new ReadableStream<Uint8Array>({ start() {}, cancel });
      return new Response(stream, { headers: { 'Content-Type': 'application/json' } });
    });
    let outcome: unknown;
    const request = http.get('/api/body-stall', undefined, idContract, { timeoutMs: 5 });
    void request.then(
      (value) => {
        outcome = value;
      },
      (error: unknown) => {
        outcome = error;
      },
    );
    try {
      await vi.advanceTimersByTimeAsync(5);
      expect(outcome).toMatchObject({ status: 0, message: 'request timeout' });
      expect(cancel).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  test('Retry-After waiting cannot outlive the logical request timeout', async () => {
    let calls = 0;
    server.use(
      mswHttp.get('/api/retry-after-deadline', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              { status: 429, code: 'request.rate-limited', detail: 'wait' },
              {
                status: 429,
                headers: { 'Content-Type': 'application/problem+json', 'Retry-After': '1' },
              },
            )
          : HttpResponse.json({ id: 1 });
      }),
    );

    await expect(
      http.get('/api/retry-after-deadline', undefined, idContract, { timeoutMs: 5 }),
    ).rejects.toMatchObject({ status: 0, message: 'request timeout' });
    expect(calls).toBe(1);
  });

  test('caller abort remains connected while a blob body is being read', async () => {
    vi.useFakeTimers();
    const cancel = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      const stream = new ReadableStream<Uint8Array>({ start() {}, cancel });
      vi.spyOn(stream, 'getReader');
      return new Response(stream, { headers: { 'Content-Type': 'application/octet-stream' } });
    });
    const controller = new AbortController();
    let outcome: unknown;
    const request = http.get('/api/blob-stall', undefined, blobContract, {
      signal: controller.signal,
    });
    void request.then(
      (value) => {
        outcome = value;
      },
      (error: unknown) => {
        outcome = error;
      },
    );
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    try {
      await vi.advanceTimersByTimeAsync(5);
      expect(outcome).toMatchObject({ status: 0, message: 'request aborted' });
      expect(cancel).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  test('auth refresh waiting is bounded by the same logical request timeout', async () => {
    bindTokenGetter(() => 'old-token');
    bindRefreshForTest(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('new-token'), 50)),
    );
    server.use(
      mswHttp.get('/api/refresh-stall', () =>
        HttpResponse.json(
          { status: 401, code: 'auth.token.expired', detail: 'expired' },
          { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    await expect(
      http.get('/api/refresh-stall', undefined, idContract, { timeoutMs: 5 }),
    ).rejects.toMatchObject({ status: 0, message: 'request timeout' });
  });

  test('a pre-aborted signal does not start fetch or an unobserved body promise', async () => {
    const controller = new AbortController();
    controller.abort();
    let sourceStarts = 0;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(bodyController) {
          sourceStarts += 1;
          bodyController.error(new Error('source started'));
        },
      });
      return new Response(stream, { headers: { 'Content-Type': 'application/json' } });
    });

    await expect(
      http.get('/api/pre-aborted', undefined, idContract, { signal: controller.signal }),
    ).rejects.toMatchObject({ status: 0, message: 'request aborted' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sourceStarts).toBe(0);
  });

  test.each([
    ['success', 200],
    ['error', 502],
  ])(
    'caller abort settles before a signal-ignoring delayed %s fetch and never starts body read',
    async (_label, status) => {
      vi.useFakeTimers();
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.error(new Error('body read must not start'));
        },
      });
      const getReader = vi.spyOn(stream, 'getReader');
      vi.spyOn(globalThis, 'fetch').mockImplementation(
        () =>
          new Promise<Response>((resolve) => {
            setTimeout(
              () =>
                resolve(
                  new Response(stream, {
                    status,
                    headers: { 'Content-Type': status === 200 ? 'application/json' : 'text/plain' },
                  }),
                ),
              20,
            );
          }),
      );
      const controller = new AbortController();
      let outcome: unknown;
      const request = http.get('/api/ignores-signal', undefined, idContract, {
        signal: controller.signal,
      });
      void request.then(
        (value) => {
          outcome = value;
        },
        (error: unknown) => {
          outcome = error;
        },
      );
      setTimeout(() => controller.abort(), 5);

      try {
        await vi.advanceTimersByTimeAsync(5);
        expect(outcome).toMatchObject({ status: 0, message: 'request aborted' });
        await vi.advanceTimersByTimeAsync(15);
        expect(getReader).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    },
  );

  test('core-owned readers preserve normal multi-chunk JSON and blob payloads', async () => {
    const jsonStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"id":'));
        controller.enqueue(new TextEncoder().encode('7}'));
        controller.close();
      },
    });
    const blobStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('ab'));
        controller.enqueue(new TextEncoder().encode('cd'));
        controller.close();
      },
    });
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(jsonStream, { headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(
        new Response(blobStream, { headers: { 'Content-Type': 'application/octet-stream' } }),
      );

    await expect(http.get('/api/multi-json', undefined, idContract)).resolves.toEqual({ id: 7 });
    const result = await http.get('/api/multi-blob', undefined, blobContract);
    expect(await result.blob.text()).toBe('abcd');
    expect(result.blob.type).toBe('application/octet-stream');
  });

  test('large multi-chunk blob is constructed from one owned ArrayBuffer part per source chunk', async () => {
    const OriginalBlob = globalThis.Blob;
    const observedParts: BlobPart[][] = [];
    class ObservedBlob extends OriginalBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        observedParts.push(parts ?? []);
        super(parts, options);
      }
    }
    vi.stubGlobal('Blob', ObservedBlob);
    const chunkSize = 256 * 1024;
    const chunks = [
      new Uint8Array(chunkSize).fill(0x11),
      new Uint8Array(chunkSize).fill(0x22),
      new Uint8Array(chunkSize).fill(0x33),
    ];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, { headers: { 'Content-Type': 'application/octet-stream' } }),
    );

    const result = await http.get('/api/large-multi-blob', undefined, blobContract);
    expect(observedParts).toHaveLength(1);
    expect(observedParts[0]).toHaveLength(3);
    expect(observedParts[0]?.every((part) => part instanceof ArrayBuffer)).toBe(true);
    expect(result.blob.size).toBe(chunkSize * 3);
    expect(result.blob.type).toBe('application/octet-stream');
    const bytes = new Uint8Array(await result.blob.arrayBuffer());
    expect([bytes[0], bytes[chunkSize], bytes[chunkSize * 2], bytes.at(-1)]).toEqual([
      0x11,
      0x22,
      0x33,
      0x33,
    ]);
  });

  test('oversized error bodies are cancelled after the byte limit instead of fully buffered', async () => {
    const cancel = vi.fn();
    const hugeBody = new TextEncoder().encode(`gateway ${'x'.repeat(70_000)}`);
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(hugeBody);
            closeTimer = setTimeout(() => controller.close(), 50);
          },
          cancel() {
            if (closeTimer) clearTimeout(closeTimer);
            cancel();
          },
        }),
        { status: 502, headers: { 'Content-Type': 'text/plain' } },
      ),
    );

    await expect(http.post('/api/huge-error', {}, anyContract)).rejects.toMatchObject({
      status: 502,
      code: 'transport.http-error',
    });
    expect(cancel).toHaveBeenCalledOnce();
  });
});

describe('allow-listed authentication replay', () => {
  const expiredProblem = {
    status: 401,
    code: 'auth.token.expired',
    detail: 'access token expired',
  };

  test('concurrent requests share one refresh flight and replay with the new token', async () => {
    let token = 'old-token';
    let refreshCalls = 0;
    let releaseRefresh: () => void = () => undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const requestCalls = new Map<string, number>();
    bindTokenGetter(() => token);
    bindRefreshForTest(
      async () => {
        refreshCalls += 1;
        await refreshGate;
        return 'new-token';
      },
      (nextToken) => {
        token = nextToken;
      },
    );
    server.use(
      mswHttp.get('/api/protected/:id', ({ params, request }) => {
        const id = String(params.id);
        requestCalls.set(id, (requestCalls.get(id) ?? 0) + 1);
        return request.headers.get('Authorization') === 'Bearer new-token'
          ? HttpResponse.json({ id: Number(id) })
          : HttpResponse.json(expiredProblem, {
              status: 401,
              headers: { 'Content-Type': 'application/problem+json' },
            });
      }),
    );

    const first = http.get('/api/protected/1', undefined, idContract);
    const second = http.get('/api/protected/2', undefined, idContract);
    await vi.waitFor(() => expect(refreshCalls).toBe(1));
    releaseRefresh();

    await expect(Promise.all([first, second])).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(refreshCalls).toBe(1);
    expect(requestCalls).toEqual(new Map([['1', 2], ['2', 2]]));
  });

  test('core-controlled concurrent refresh commits the returned token exactly once', async () => {
    let token = 'old-token';
    let refreshCalls = 0;
    let commitCalls = 0;
    let refreshSignal: AbortSignal | undefined;
    let releaseRefresh: () => void = () => undefined;
    const refreshGate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    bindTokenGetter(() => token);
    bindAuthRefreshHandler({
      refresh: async (signal: AbortSignal) => {
        refreshCalls += 1;
        refreshSignal = signal;
        await refreshGate;
        return 'new-token';
      },
      commitToken: (nextToken: string) => {
        commitCalls += 1;
        token = nextToken;
      },
    });
    server.use(
      mswHttp.get('/api/core-commit/:id', ({ params, request }) =>
        request.headers.get('Authorization') === 'Bearer new-token'
          ? HttpResponse.json({ id: Number(params.id) })
          : HttpResponse.json(expiredProblem, {
              status: 401,
              headers: { 'Content-Type': 'application/problem+json' },
            }),
      ),
    );

    const first = http.get('/api/core-commit/1', undefined, idContract);
    const second = http.get('/api/core-commit/2', undefined, idContract);
    await vi.waitFor(() => expect(refreshCalls).toBe(1));
    releaseRefresh();

    await expect(Promise.all([first, second])).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(refreshSignal).toBeInstanceOf(AbortSignal);
    expect(commitCalls).toBe(1);
    expect(token).toBe('new-token');
  });

  test('a late old-token 401 replays after auth state advances without starting another refresh', async () => {
    let token = 'old-token';
    let refreshCalls = 0;
    let releaseLateResponse: () => void = () => undefined;
    const lateResponseGate = new Promise<void>((resolve) => {
      releaseLateResponse = resolve;
    });
    const requestCalls = new Map<string, number>();
    bindTokenGetter(() => token);
    bindRefreshForTest(
      async () => {
        refreshCalls += 1;
        releaseLateResponse();
        return 'new-token';
      },
      (nextToken) => {
        token = nextToken;
      },
    );
    server.use(
      mswHttp.get('/api/late-protected/:id', async ({ params, request }) => {
        const id = String(params.id);
        requestCalls.set(id, (requestCalls.get(id) ?? 0) + 1);
        const authorization = request.headers.get('Authorization');
        if (authorization === 'Bearer new-token') return HttpResponse.json({ id: Number(id) });
        if (id === '2') await lateResponseGate;
        return HttpResponse.json(expiredProblem, {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        });
      }),
    );

    await expect(
      Promise.all([
        http.get('/api/late-protected/1', undefined, idContract),
        http.get('/api/late-protected/2', undefined, idContract),
      ]),
    ).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(refreshCalls).toBe(1);
    expect(requestCalls).toEqual(new Map([['1', 2], ['2', 2]]));
  });

  test('a failed refresh stays latched for the same token generation', async () => {
    let token = 'old-token';
    let refreshCalls = 0;
    let events = 0;
    const off = authEvents.on('expired', () => {
      events += 1;
    });
    bindTokenGetter(() => token);
    bindRefreshForTest(async () => {
      refreshCalls += 1;
      throw new Error('refresh denied');
    });
    server.use(
      mswHttp.get('/api/failed-refresh', () =>
        HttpResponse.json(expiredProblem, {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      ),
    );

    await expect(http.get('/api/failed-refresh', undefined, idContract)).rejects.toBeInstanceOf(
      AuthExpiredError,
    );
    await new Promise((resolve) => setTimeout(resolve, 5));
    await expect(http.get('/api/failed-refresh', undefined, idContract)).rejects.toBeInstanceOf(
      AuthExpiredError,
    );
    expect(refreshCalls).toBe(1);
    expect(events).toBe(1);

    token = 'next-session-token';
    await expect(http.get('/api/failed-refresh', undefined, idContract)).rejects.toBeInstanceOf(
      AuthExpiredError,
    );
    expect(refreshCalls).toBe(2);
    expect(events).toBe(2);
    off();
  });

  test('POST mutation gets exactly one authentication replay and no transport retry', async () => {
    let token = 'old-token';
    let refreshCalls = 0;
    let mutationCalls = 0;
    bindTokenGetter(() => token);
    bindRefreshForTest(
      async () => {
        refreshCalls += 1;
        return 'new-token';
      },
      (nextToken) => {
        token = nextToken;
      },
    );
    server.use(
      mswHttp.post('/api/protected-mutation', async ({ request }) => {
        mutationCalls += 1;
        const input = z.object({ name: z.string() }).parse(await request.json());
        return request.headers.get('Authorization') === 'Bearer new-token'
          ? HttpResponse.json(input)
          : HttpResponse.json(expiredProblem, {
              status: 401,
              headers: { 'Content-Type': 'application/problem+json' },
            });
      }),
    );
    const contract = defineApiContract({ response: z.object({ name: z.string() }) });

    await expect(http.post('/api/protected-mutation', { name: 'Ada' }, contract)).resolves.toEqual({
      name: 'Ada',
    });
    expect(refreshCalls).toBe(1);
    expect(mutationCalls).toBe(2);
  });

  test('an empty token is normalized once and cannot authorize, refresh, or replay', async () => {
    let refreshCalls = 0;
    let requestCalls = 0;
    const authorizationHeaders: Array<string | null> = [];
    bindTokenGetter(() => '');
    bindRefreshForTest(async () => {
      refreshCalls += 1;
      return 'unused-token';
    });
    server.use(
      mswHttp.get('/api/empty-token', ({ request }) => {
        requestCalls += 1;
        authorizationHeaders.push(request.headers.get('Authorization'));
        return HttpResponse.json(expiredProblem, {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        });
      }),
    );

    await expect(http.get('/api/empty-token', undefined, idContract)).rejects.toBeInstanceOf(
      BizError,
    );
    expect(authorizationHeaders).toEqual([null]);
    expect(refreshCalls).toBe(0);
    expect(requestCalls).toBe(1);
  });

  test.each([
    ['request without access token', null, '/api/no-token', expiredProblem],
    [
      'non allow-listed 401',
      'old-token',
      '/api/ordinary-401',
      { status: 401, code: 'auth.credentials.invalid', detail: 'bad credentials' },
    ],
  ])('%s does not refresh or replay', async (_label, token, path, problem) => {
    let refreshCalls = 0;
    let requestCalls = 0;
    bindTokenGetter(() => token);
    bindRefreshForTest(async () => {
      refreshCalls += 1;
      return 'unused-token';
    });
    server.use(
      mswHttp.post(path, () => {
        requestCalls += 1;
        return HttpResponse.json(problem, {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        });
      }),
    );

    await expect(http.post(path, {}, anyContract, { on401: 'reject' })).rejects.toBeInstanceOf(
      BizError,
    );
    expect(refreshCalls).toBe(0);
    expect(requestCalls).toBe(1);
  });

  test.each([
    '/api/auth/login',
    '/api/auth/sms-login',
    '/api/auth/qr-login',
    '/api/auth/refresh',
  ])('%s is a canonical auth replay exclusion even with an old token', async (path) => {
    let refreshCalls = 0;
    let requestCalls = 0;
    bindTokenGetter(() => 'old-token');
    bindRefreshForTest(async () => {
      refreshCalls += 1;
      return 'unused-token';
    });
    server.use(
      mswHttp.post(path, () => {
        requestCalls += 1;
        return HttpResponse.json(expiredProblem, {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        });
      }),
    );

    await http.post(path, {}, anyContract).catch(() => undefined);
    expect(refreshCalls).toBe(0);
    expect(requestCalls).toBe(1);
  });

  test("on401:'reject' is a hard replay veto outside the configured auth paths", async () => {
    let refreshCalls = 0;
    let requestCalls = 0;
    bindTokenGetter(() => 'old-token');
    bindRefreshForTest(async () => {
      refreshCalls += 1;
      return 'unused-token';
    });
    server.use(
      mswHttp.post('/api/custom-auth-entry', () => {
        requestCalls += 1;
        return HttpResponse.json(expiredProblem, {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        });
      }),
    );

    await http
      .post('/api/custom-auth-entry', {}, anyContract, { on401: 'reject' })
      .catch(() => undefined);
    expect(refreshCalls).toBe(0);
    expect(requestCalls).toBe(1);
  });

  test('missing refresh binding fails closed and emits expiry once for concurrent requests', async () => {
    let events = 0;
    const off = authEvents.on('expired', () => {
      events += 1;
    });
    bindTokenGetter(() => 'old-token');
    bindAuthRefreshHandler(null);
    server.use(
      mswHttp.get('/api/unbound-refresh/:id', () =>
        HttpResponse.json(expiredProblem, {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      ),
    );

    const results = await Promise.allSettled([
      http.get('/api/unbound-refresh/1', undefined, idContract),
      http.get('/api/unbound-refresh/2', undefined, idContract),
    ]);

    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    for (const result of results) {
      if (result.status === 'rejected') expect(result.reason).toBeInstanceOf(AuthExpiredError);
    }
    expect(events).toBe(1);
    off();
  });

  test('a replay that is still expired is not refreshed twice and expires once', async () => {
    let token = 'token';
    let refreshCalls = 0;
    let requestCalls = 0;
    let events = 0;
    const off = authEvents.on('expired', () => {
      events += 1;
    });
    bindTokenGetter(() => token);
    bindRefreshForTest(
      async () => {
        refreshCalls += 1;
        return 'refreshed-token';
      },
      (nextToken) => {
        token = nextToken;
      },
    );
    server.use(
      mswHttp.get('/api/still-expired', () => {
        requestCalls += 1;
        return HttpResponse.json(expiredProblem, {
          status: 401,
          headers: { 'Content-Type': 'application/problem+json' },
        });
      }),
    );

    await expect(http.get('/api/still-expired', undefined, idContract)).rejects.toBeInstanceOf(
      AuthExpiredError,
    );
    expect(refreshCalls).toBe(1);
    expect(requestCalls).toBe(2);
    expect(events).toBe(1);
    off();
  });
});
