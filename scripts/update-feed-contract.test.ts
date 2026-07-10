import { describe, expect, test } from 'vitest';
import { assertUpdateFeedHttpContract } from './update-feed-contract.mjs';

const evidence = {
  metadataGet: {
    status: 200,
    headers: {
      'content-type': 'application/yaml',
      'content-length': '180',
      'cache-control': 'no-cache, no-store, must-revalidate',
    },
    bodyLength: 180,
  },
  metadataHead: {
    status: 200,
    headers: {
      'content-type': 'application/yaml',
      'content-length': '180',
      'cache-control': 'no-cache, no-store, must-revalidate',
    },
    bodyLength: 0,
  },
  artifactHead: {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-length': '4096',
      'cache-control': 'public, max-age=31536000, immutable',
      'accept-ranges': 'bytes',
    },
    bodyLength: 0,
  },
  artifactRange: {
    status: 206,
    headers: {
      'content-type': 'application/zip',
      'content-length': '1',
      'content-range': 'bytes 0-0/4096',
      'cache-control': 'public, max-age=31536000, immutable',
    },
    bodyLength: 1,
  },
};

describe('generic update feed HTTP contract', () => {
  test('accepts no-cache metadata and immutable ranged artifacts', () => {
    expect(() => assertUpdateFeedHttpContract(evidence)).not.toThrow();
  });

  test.each([
    ['metadata cache', { metadataGet: { headers: { 'cache-control': 'public, max-age=3600' } } }],
    ['metadata length', { metadataGet: { bodyLength: 179 } }],
    ['missing HEAD', { metadataHead: { status: 405 } }],
    ['mutable artifact', { artifactHead: { headers: { 'cache-control': 'no-cache' } } }],
    ['missing range', { artifactRange: { status: 200 } }],
    ['wrong content range', { artifactRange: { headers: { 'content-range': 'bytes 0-1/4096' } } }],
    ['html artifact', { artifactHead: { headers: { 'content-type': 'text/html' } } }],
  ])('rejects %s', (_label, patch) => {
    const broken = structuredClone(evidence);
    for (const [section, sectionPatch] of Object.entries(patch)) {
      Object.assign(broken[section as keyof typeof broken], sectionPatch);
      if ('headers' in sectionPatch && sectionPatch.headers) {
        broken[section as keyof typeof broken].headers = {
          ...evidence[section as keyof typeof evidence].headers,
          ...sectionPatch.headers,
        };
      }
    }
    expect(() => assertUpdateFeedHttpContract(broken)).toThrow('更新源 HTTP 契约失败');
  });
});
