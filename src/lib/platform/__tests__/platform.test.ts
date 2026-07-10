import { createDesktopPlatform } from '@/lib/platform/desktop';
import { createPublicFileUrl } from '@/lib/platform/types';
import { createWebPlatform } from '@/lib/platform/web';

test('Web platform preserves browser clipboard and safe external-link semantics', async () => {
  const writeClipboardText = vi.fn().mockResolvedValue(undefined);
  const openExternal = vi.fn();
  const download = vi.fn().mockResolvedValue(6);
  const platform = createWebPlatform({
    writeClipboardText,
    openExternal,
    download,
    apiBaseUrl: 'https://api.example.com/v1',
    webPublicBaseUrl: 'https://app.example.com/console/',
    createTaskId: () => '9ba560a3-94c6-438a-9d76-1e17627fd483',
    appVersion: '0.1.0',
  });

  expect(platform.runtime).toBe('web');
  expect(platform.window.getSnapshot()).toMatchObject({
    runtime: 'web',
    platform: 'browser',
    chrome: 'native',
  });
  await platform.clipboard.writeText('share-link');
  await platform.external.open('https://docs.example.com/guide');
  await expect(platform.external.open('javascript:alert(1)')).rejects.toThrow('HTTPS');
  expect(writeClipboardText).toHaveBeenCalledWith('share-link');
  expect(openExternal).toHaveBeenCalledWith('https://docs.example.com/guide');

  const events: unknown[] = [];
  const unsubscribe = platform.files.subscribe((event) => events.push(event));
  await expect(platform.files.save({ resourceId: 'file-1', suggestedName: 'report.pdf' })).resolves.toEqual({
    taskId: '9ba560a3-94c6-438a-9d76-1e17627fd483',
  });
  await vi.waitFor(() => expect(events.at(-1)).toMatchObject({ status: 'completed' }));
  expect(events).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ status: 'progress', percent: 100, receivedBytes: 6, totalBytes: 6 }),
      expect.objectContaining({ status: 'completed', bytes: 6 }),
    ]),
  );
  expect(download).toHaveBeenCalledWith(
    'https://api.example.com/v1/api/files/file-1/download',
    'report.pdf',
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(platform.files.createShareUrl('file-1')).toBe(
    'https://app.example.com/console/admin/files?fileId=file-1',
  );
  unsubscribe();

  const updateEvents: unknown[] = [];
  const unsubscribeUpdater = platform.updater.subscribe((snapshot) => updateEvents.push(snapshot));
  await expect(platform.updater.getSnapshot()).resolves.toMatchObject({
    status: 'unsupported',
    currentVersion: '0.1.0',
  });
  await expect(platform.updater.check()).resolves.toEqual({
    ok: false,
    error: { code: 'UNSUPPORTED', command: 'check', status: 'unsupported' },
  });
  expect(updateEvents).toEqual([expect.objectContaining({ status: 'unsupported' })]);
  unsubscribeUpdater();
});

test('public share URLs reject remote cleartext HTTP', () => {
  expect(() => createPublicFileUrl('http://app.example.com', 'file-1')).toThrow('HTTPS');
  expect(createPublicFileUrl('http://localhost:5173', 'file-1')).toBe(
    'http://localhost:5173/admin/files?fileId=file-1',
  );
});

test('Web credentials preserve the existing auth localStorage envelope', async () => {
  const values = new Map([['auth', JSON.stringify({ state: { token: 'legacy-token' }, version: 0 })]]);
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
  const platform = createWebPlatform({
    writeClipboardText: vi.fn(),
    openExternal: vi.fn(),
    credentialStorage: storage,
    download: vi.fn(),
  });

  await expect(platform.credentials.restore()).resolves.toBe('legacy-token');
  await platform.credentials.persist('next-token');
  expect(JSON.parse(values.get('auth') ?? '')).toEqual({ state: { token: 'next-token' }, version: 0 });
  await platform.credentials.clear('logout');
  expect(values.has('auth')).toBe(false);
});

test('Desktop platform delegates only to the typed Preload API', async () => {
  const api = {
    window: {
      getSnapshot: vi.fn(
        () =>
          ({
            runtime: 'desktop',
            platform: 'darwin',
            chrome: 'integrated',
            controlsInsetLeft: 80,
            controlsInsetRight: 0,
            titlebarHeight: 56,
            maximized: false,
            fullScreen: false,
            scaleFactor: 2,
          }) as const,
      ),
      subscribe: vi.fn(() => () => undefined),
    },
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    external: { open: vi.fn().mockResolvedValue(undefined) },
    credentials: {
      restore: vi.fn().mockResolvedValue('desktop-token'),
      persist: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    files: {
      save: vi.fn().mockResolvedValue({ taskId: '9ba560a3-94c6-438a-9d76-1e17627fd483' }),
      cancel: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(() => () => undefined),
    },
    updater: {
      getSnapshot: vi.fn().mockResolvedValue({
        status: 'idle',
        currentVersion: '0.1.0',
        operationId: null,
        lastCommand: null,
        retryable: false,
        targetVersion: null,
        releaseDate: null,
        releaseNotes: null,
        packageSize: null,
        transferred: 0,
        total: 0,
        percent: 0,
        bytesPerSecond: 0,
        errorCode: null,
      }),
      command: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'INVALID_STATE', command: 'download', status: 'idle' },
      }),
      subscribe: vi.fn(() => () => undefined),
    },
  } as const;
  const platform = createDesktopPlatform(api, 'https://app.example.com/console/');

  expect(platform.runtime).toBe('desktop');
  expect(platform.window.getSnapshot()).toEqual({
    runtime: 'desktop',
    platform: 'darwin',
    chrome: 'integrated',
    controlsInsetLeft: 80,
    controlsInsetRight: 0,
    titlebarHeight: 56,
    maximized: false,
    fullScreen: false,
    scaleFactor: 2,
  });
  await platform.clipboard.writeText('tracking-id');
  await platform.external.open('https://docs.example.com');
  await expect(platform.credentials.restore()).resolves.toBe('desktop-token');
  expect(api.clipboard.writeText).toHaveBeenCalledWith('tracking-id');
  expect(api.external.open).toHaveBeenCalledWith('https://docs.example.com');
  await platform.files.save({ resourceId: 'file-1', suggestedName: 'report.pdf' });
  await platform.files.cancel('9ba560a3-94c6-438a-9d76-1e17627fd483');
  expect(platform.files.createShareUrl('file-1')).toBe(
    'https://app.example.com/console/admin/files?fileId=file-1',
  );
  expect(api.files.save).toHaveBeenCalledWith({ resourceId: 'file-1', suggestedName: 'report.pdf' });
  expect(api.files.cancel).toHaveBeenCalledWith('9ba560a3-94c6-438a-9d76-1e17627fd483');
  await expect(platform.updater.getSnapshot()).resolves.toMatchObject({ status: 'idle' });
  await platform.updater.download();
  expect(api.updater.command).toHaveBeenCalledWith('download');
});
