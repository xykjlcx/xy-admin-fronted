import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import type { FileDownloadEvent } from '../shared/schemas';
import {
  createDownloadManager,
  resolveDownloadRedirect,
  sanitizeSuggestedFilename,
  type DownloadResponse,
} from './download-manager';

const directories: string[] = [];

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'electron-download-'));
  directories.push(directory);
  return directory;
}

async function* chunks(...values: string[]): AsyncIterable<Uint8Array> {
  for (const value of values) yield Buffer.from(value);
}

function response(
  statusCode: number,
  headers: Record<string, string>,
  body: AsyncIterable<Uint8Array> = chunks(),
): DownloadResponse {
  return { statusCode, headers, body, dispose: vi.fn() };
}

async function waitForTerminal(events: FileDownloadEvent[]): Promise<FileDownloadEvent> {
  await vi.waitFor(() => expect(events.some((event) => event.status !== 'progress')).toBe(true));
  const terminal = events.find((event) => event.status !== 'progress');
  if (!terminal) throw new Error('terminal event is missing');
  return terminal;
}

describe('download filename safety', () => {
  test.each([
    ['../../secret.txt', 'secret.txt'],
    ['..\\..\\report?.pdf', 'report_.pdf'],
    ['CON.txt', '_CON.txt'],
    ['  quarterly report.  ', 'quarterly report'],
    ['\u0000\u0008', 'download'],
  ])('sanitizes %j to %j', (input, expected) => {
    expect(sanitizeSuggestedFilename(input)).toBe(expected);
  });

  test('bounds long names while preserving the extension', () => {
    const sanitized = sanitizeSuggestedFilename(`${'a'.repeat(240)}.pdf`);
    expect(sanitized.length).toBeLessThanOrEqual(180);
    expect(sanitized.endsWith('.pdf')).toBe(true);
    expect(sanitizeSuggestedFilename(`a.${'x'.repeat(240)}`).length).toBeLessThanOrEqual(180);
  });
});

describe('download redirect policy', () => {
  test('retains auth on same-origin redirects and permanently strips it after an approved origin change', () => {
    const sameOrigin = resolveDownloadRedirect({
      currentUrl: 'https://api.example.com/api/files/1/download',
      location: '/signed/1',
      apiOrigin: 'https://api.example.com',
      approvedOrigins: new Set(['https://api.example.com', 'https://cdn.example.com']),
      authorizationAllowed: true,
      visitedUrls: new Set(['https://api.example.com/api/files/1/download']),
      redirectCount: 0,
    });
    expect(sameOrigin).toMatchObject({
      url: 'https://api.example.com/signed/1',
      authorizationAllowed: true,
      redirectCount: 1,
    });

    const crossOrigin = resolveDownloadRedirect({
      ...sameOrigin,
      currentUrl: sameOrigin.url,
      location: 'https://cdn.example.com/object/1',
      apiOrigin: 'https://api.example.com',
      approvedOrigins: new Set(['https://api.example.com', 'https://cdn.example.com']),
      visitedUrls: new Set(['https://api.example.com/api/files/1/download', sameOrigin.url]),
    });
    expect(crossOrigin.authorizationAllowed).toBe(false);

    const returnToApi = resolveDownloadRedirect({
      ...crossOrigin,
      currentUrl: crossOrigin.url,
      location: 'https://api.example.com/final',
      apiOrigin: 'https://api.example.com',
      approvedOrigins: new Set(['https://api.example.com', 'https://cdn.example.com']),
      visitedUrls: new Set(['https://api.example.com/api/files/1/download', sameOrigin.url, crossOrigin.url]),
    });
    expect(returnToApi.authorizationAllowed).toBe(false);
  });

  test.each([
    ['http://cdn.example.com/file', 'UNSAFE_REDIRECT'],
    ['file:///tmp/secret', 'UNSAFE_REDIRECT'],
    ['data:text/plain,secret', 'UNSAFE_REDIRECT'],
    ['javascript:alert(1)', 'UNSAFE_REDIRECT'],
    ['https://evil.example.com/file', 'UNAPPROVED_ORIGIN'],
  ])('rejects redirect target %s', (location, code) => {
    expect(() =>
      resolveDownloadRedirect({
        currentUrl: 'https://api.example.com/start',
        location,
        apiOrigin: 'https://api.example.com',
        approvedOrigins: new Set(['https://api.example.com', 'https://cdn.example.com']),
        authorizationAllowed: true,
        visitedUrls: new Set(['https://api.example.com/start']),
        redirectCount: 0,
      }),
    ).toThrow(code);
  });

  test('rejects loops and more than five redirects', () => {
    expect(() =>
      resolveDownloadRedirect({
        currentUrl: 'https://api.example.com/start',
        location: '/start',
        apiOrigin: 'https://api.example.com',
        approvedOrigins: new Set(['https://api.example.com']),
        authorizationAllowed: true,
        visitedUrls: new Set(['https://api.example.com/start']),
        redirectCount: 0,
      }),
    ).toThrow('REDIRECT_LOOP');
    expect(() =>
      resolveDownloadRedirect({
        currentUrl: 'https://api.example.com/five',
        location: '/six',
        apiOrigin: 'https://api.example.com',
        approvedOrigins: new Set(['https://api.example.com']),
        authorizationAllowed: true,
        visitedUrls: new Set(['https://api.example.com/five']),
        redirectCount: 5,
      }),
    ).toThrow('TOO_MANY_REDIRECTS');
  });
});

describe('main download manager', () => {
  test('streams with vault auth, emits progress, and atomically replaces the selected target', async () => {
    const directory = await temporaryDirectory();
    const targetPath = path.join(directory, 'report.pdf');
    await writeFile(targetPath, 'old');
    const events: FileDownloadEvent[] = [];
    const request = vi
      .fn()
      .mockResolvedValue(response(200, { 'content-length': '11' }, chunks('hello ', 'world')));
    const manager = createDownloadManager({
      apiBaseUrl: 'https://api.example.com/v1',
      approvedOrigins: new Set(['https://api.example.com']),
      allowInsecureApi: false,
      restoreCredential: vi.fn().mockResolvedValue('vault-token'),
      showSaveDialog: vi.fn().mockResolvedValue(targetPath),
      request,
      availableBytes: vi.fn().mockResolvedValue(1024),
      emit: (event) => events.push(event),
      createTaskId: () => '9ba560a3-94c6-438a-9d76-1e17627fd483',
    });

    const result = manager.start({ resourceId: 'report-1', suggestedName: '../../report.pdf' });
    expect(result).toEqual({ taskId: '9ba560a3-94c6-438a-9d76-1e17627fd483' });
    await expect(waitForTerminal(events)).resolves.toMatchObject({
      status: 'completed',
      filename: 'report.pdf',
      bytes: 11,
    });
    expect(await readFile(targetPath, 'utf8')).toBe('hello world');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.example.com/v1/api/files/report-1/download',
        headers: { 'Accept-Encoding': 'identity', Authorization: 'Bearer vault-token' },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(events.filter((event) => event.status === 'progress')).toEqual([
      expect.objectContaining({ receivedBytes: 0, totalBytes: 11, percent: 0 }),
      expect.objectContaining({ receivedBytes: 6, totalBytes: 11, percent: 55 }),
      expect.objectContaining({ receivedBytes: 11, totalBytes: 11, percent: 100 }),
    ]);
    expect(await readdir(directory)).toEqual(['report.pdf']);
  });

  test('follows redirects one hop at a time and removes auth before a cross-origin request', async () => {
    const directory = await temporaryDirectory();
    const targetPath = path.join(directory, 'report.pdf');
    const events: FileDownloadEvent[] = [];
    const request = vi
      .fn()
      .mockResolvedValueOnce(response(302, { location: '/same-origin' }))
      .mockResolvedValueOnce(response(307, { location: 'https://cdn.example.com/object' }))
      .mockResolvedValueOnce(response(200, { 'content-length': '4' }, chunks('safe')));
    const manager = createDownloadManager({
      apiBaseUrl: 'https://api.example.com',
      approvedOrigins: new Set(['https://api.example.com', 'https://cdn.example.com']),
      allowInsecureApi: false,
      restoreCredential: vi.fn().mockResolvedValue('vault-token'),
      showSaveDialog: vi.fn().mockResolvedValue(targetPath),
      request,
      availableBytes: vi.fn().mockResolvedValue(1024),
      emit: (event) => events.push(event),
      createTaskId: () => '9ba560a3-94c6-438a-9d76-1e17627fd483',
    });

    manager.start({ resourceId: 'report-1', suggestedName: 'report.pdf' });
    await expect(waitForTerminal(events)).resolves.toMatchObject({ status: 'completed' });
    expect(request.mock.calls.map(([input]) => input.headers)).toEqual([
      { 'Accept-Encoding': 'identity', Authorization: 'Bearer vault-token' },
      { 'Accept-Encoding': 'identity', Authorization: 'Bearer vault-token' },
      { 'Accept-Encoding': 'identity' },
    ]);
  });

  test.each([
    ['missing length', response(200, {}, chunks('body')), 1024, 'MISSING_CONTENT_LENGTH'],
    ['insufficient disk', response(200, { 'content-length': '4' }, chunks('body')), 3, 'INSUFFICIENT_DISK'],
    [
      'length mismatch',
      response(200, { 'content-length': '5' }, chunks('body')),
      1024,
      'CONTENT_LENGTH_MISMATCH',
    ],
  ])('emits a testable error and removes the temp file for %s', async (_label, result, space, code) => {
    const directory = await temporaryDirectory();
    const targetPath = path.join(directory, 'report.pdf');
    const events: FileDownloadEvent[] = [];
    const manager = createDownloadManager({
      apiBaseUrl: 'https://api.example.com',
      approvedOrigins: new Set(['https://api.example.com']),
      allowInsecureApi: false,
      restoreCredential: vi.fn().mockResolvedValue(null),
      showSaveDialog: vi.fn().mockResolvedValue(targetPath),
      request: vi.fn().mockResolvedValue(result),
      availableBytes: vi.fn().mockResolvedValue(space),
      emit: (event) => events.push(event),
      createTaskId: () => '9ba560a3-94c6-438a-9d76-1e17627fd483',
    });

    manager.start({ resourceId: 'report-1', suggestedName: 'report.pdf' });
    await expect(waitForTerminal(events)).resolves.toMatchObject({ status: 'error', code });
    expect(await readdir(directory)).toEqual([]);
  });

  test('cancels an active stream and removes its temp file', async () => {
    const directory = await temporaryDirectory();
    const targetPath = path.join(directory, 'report.pdf');
    const events: FileDownloadEvent[] = [];
    let release: (() => void) | undefined;
    async function* slowBody(): AsyncIterable<Uint8Array> {
      yield Buffer.from('half');
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      yield Buffer.from('done');
    }
    const manager = createDownloadManager({
      apiBaseUrl: 'https://api.example.com',
      approvedOrigins: new Set(['https://api.example.com']),
      allowInsecureApi: false,
      restoreCredential: vi.fn().mockResolvedValue(null),
      showSaveDialog: vi.fn().mockResolvedValue(targetPath),
      request: vi.fn().mockResolvedValue(response(200, { 'content-length': '8' }, slowBody())),
      availableBytes: vi.fn().mockResolvedValue(1024),
      emit: (event) => events.push(event),
      createTaskId: () => '9ba560a3-94c6-438a-9d76-1e17627fd483',
    });

    const { taskId } = manager.start({ resourceId: 'report-1', suggestedName: 'report.pdf' });
    await vi.waitFor(() => expect(events).toContainEqual(expect.objectContaining({ receivedBytes: 4 })));
    expect(manager.cancel(taskId)).toBe(true);
    release?.();
    await expect(waitForTerminal(events)).resolves.toMatchObject({ status: 'cancelled' });
    expect(await readdir(directory)).toEqual([]);
  });

  test('cancels all active streams and waits for temp-file cleanup before disposal completes', async () => {
    const directory = await temporaryDirectory();
    const targetPath = path.join(directory, 'report.pdf');
    const events: FileDownloadEvent[] = [];
    let release: (() => void) | undefined;
    async function* slowBody(): AsyncIterable<Uint8Array> {
      yield Buffer.from('half');
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      yield Buffer.from('done');
    }
    const manager = createDownloadManager({
      apiBaseUrl: 'https://api.example.com',
      approvedOrigins: new Set(['https://api.example.com']),
      allowInsecureApi: false,
      restoreCredential: vi.fn().mockResolvedValue(null),
      showSaveDialog: vi.fn().mockResolvedValue(targetPath),
      request: vi.fn().mockResolvedValue(response(200, { 'content-length': '8' }, slowBody())),
      availableBytes: vi.fn().mockResolvedValue(1024),
      emit: (event) => events.push(event),
      createTaskId: () => '9ba560a3-94c6-438a-9d76-1e17627fd483',
    });

    manager.start({ resourceId: 'report-1', suggestedName: 'report.pdf' });
    await vi.waitFor(() => expect(events).toContainEqual(expect.objectContaining({ receivedBytes: 4 })));
    const disposal = manager.dispose();
    release?.();
    await disposal;

    expect(events).toContainEqual(expect.objectContaining({ status: 'cancelled' }));
    expect(await readdir(directory)).toEqual([]);
  });
});
