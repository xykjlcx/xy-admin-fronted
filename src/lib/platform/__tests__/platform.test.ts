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

test('Desktop platform delegates only to the typed Preload API', async () => {
  const api = {
    window: {
      getSnapshot: vi.fn(() => ({ runtime: 'desktop', platform: 'darwin', chrome: 'integrated' }) as const),
    },
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    external: { open: vi.fn().mockResolvedValue(undefined) },
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
  expect(api.clipboard.writeText).toHaveBeenCalledWith('tracking-id');
  expect(api.external.open).toHaveBeenCalledWith('https://docs.example.com');
});
