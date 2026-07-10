import { createDesktopPlatform } from '@/lib/platform/desktop';
import { createWebPlatform } from '@/lib/platform/web';

test('Web platform preserves browser clipboard and safe external-link semantics', async () => {
  const writeClipboardText = vi.fn().mockResolvedValue(undefined);
  const openExternal = vi.fn();
  const platform = createWebPlatform({ writeClipboardText, openExternal });

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
      getSnapshot: vi.fn(() => ({ runtime: 'desktop', platform: 'darwin', chrome: 'integrated' }) as const),
    },
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    external: { open: vi.fn().mockResolvedValue(undefined) },
    credentials: {
      restore: vi.fn().mockResolvedValue('desktop-token'),
      persist: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  } as const;
  const platform = createDesktopPlatform(api);

  expect(platform.runtime).toBe('desktop');
  expect(platform.window.getSnapshot()).toEqual({
    runtime: 'desktop',
    platform: 'darwin',
    chrome: 'integrated',
  });
  await platform.clipboard.writeText('tracking-id');
  await platform.external.open('https://docs.example.com');
  await expect(platform.credentials.restore()).resolves.toBe('desktop-token');
  expect(api.clipboard.writeText).toHaveBeenCalledWith('tracking-id');
  expect(api.external.open).toHaveBeenCalledWith('https://docs.example.com');
});
