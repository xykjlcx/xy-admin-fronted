import { createHash } from 'node:crypto';
import { dump } from 'js-yaml';
import { expect, test, vi } from 'vitest';
import { verifyPublicUpdateFeed } from './verify-update-feed.mjs';

test('reads back public metadata, headers, range, length and sha512 from an HTTPS feed', async () => {
  const artifact = Buffer.from('public artifact fixture');
  const artifactName = 'app-0.2.0-arm64.zip';
  const digest = createHash('sha512').update(artifact).digest('base64');
  const metadata = dump({
    version: '0.2.0',
    files: [{ url: artifactName, sha512: digest, size: artifact.length }],
    path: artifactName,
    sha512: digest,
    releaseDate: '2026-07-11T00:00:00.000Z',
  });
  const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.endsWith('latest-mac.yml')) {
      const headers = {
        'content-type': 'application/yaml',
        'content-length': String(Buffer.byteLength(metadata)),
        'cache-control': 'no-cache, no-store, must-revalidate',
      };
      return new Response(method === 'HEAD' ? null : metadata, { status: 200, headers });
    }
    if (method === 'HEAD') {
      return new Response(null, {
        status: 200,
        headers: {
          'content-type': 'application/zip',
          'content-length': String(artifact.length),
          'cache-control': 'public, max-age=31536000, immutable',
          'accept-ranges': 'bytes',
        },
      });
    }
    if (new Headers(init?.headers).get('range') === 'bytes=0-0') {
      return new Response(artifact.subarray(0, 1), {
        status: 206,
        headers: {
          'content-type': 'application/zip',
          'content-length': '1',
          'content-range': `bytes 0-0/${String(artifact.length)}`,
        },
      });
    }
    return new Response(artifact, { status: 200, headers: { 'content-length': String(artifact.length) } });
  });

  await expect(
    verifyPublicUpdateFeed({
      feedUrl: 'https://updates.example.com/stable/darwin/arm64/',
      metadataName: 'latest-mac.yml',
      fetchImpl,
    }),
  ).resolves.toMatchObject({ version: '0.2.0', artifact: artifactName, bytes: artifact.length });
  expect(fetchImpl).toHaveBeenCalledTimes(5);
});

test('rejects an insecure feed before making a request', async () => {
  const fetchImpl = vi.fn();
  await expect(
    verifyPublicUpdateFeed({
      feedUrl: 'http://updates.example.com/stable/darwin/arm64/',
      metadataName: 'latest-mac.yml',
      fetchImpl,
    }),
  ).rejects.toThrow('HTTPS');
  expect(fetchImpl).not.toHaveBeenCalled();
});
