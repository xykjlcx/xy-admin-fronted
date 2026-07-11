import { describe, expect, test } from 'vitest';
import { createUpdateFeedUrl } from './update-source';

describe('generic update feed URL', () => {
  test.each([
    ['darwin', 'arm64', 'https://updates.example.com/root/stable/darwin/arm64/'],
    ['darwin', 'x64', 'https://updates.example.com/root/stable/darwin/x64/'],
    ['win32', 'x64', 'https://updates.example.com/root/stable/win32/x64/'],
  ] as const)('embeds only the current %s/%s feed', (platform, arch, expected) => {
    expect(createUpdateFeedUrl('https://updates.example.com/root/', platform, arch)).toBe(expected);
  });

  test.each([
    ['linux', 'x64'],
    ['win32', 'arm64'],
    ['darwin', 'ia32'],
  ])('rejects unsupported platform/arch %s/%s', (platform, arch) => {
    expect(() => createUpdateFeedUrl('https://updates.example.com/', platform, arch)).toThrow(
      '不支持的更新平台',
    );
  });

  test.each([
    'http://updates.example.com',
    'file:///tmp/feed',
    'https://user@updates.example.com',
    'https://updates.example.com/?token=secret',
  ])('rejects an unsafe feed base: %s', (baseUrl) => {
    expect(() => createUpdateFeedUrl(baseUrl, 'darwin', 'arm64')).toThrow();
  });
});
