import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { load } from 'js-yaml';
import { assertUpdateFeedHttpContract } from './update-feed-contract.mjs';

function evidence(response, bodyLength) {
  return { status: response.status, headers: Object.fromEntries(response.headers.entries()), bodyLength };
}

function assertFeedUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('公网更新 feed 必须是无凭据、无 query/hash 的 HTTPS URL');
  }
  return url.toString().endsWith('/') ? url : new URL(`${url.toString()}/`);
}

function safeFilename(value) {
  if (typeof value !== 'string' || value !== path.posix.basename(value) || /[\\/?#]/.test(value)) {
    throw new Error('公网更新 metadata 的产物文件名无效');
  }
  return value;
}

async function digestResponse(response) {
  if (!response.body) throw new Error('公网更新产物响应缺少 body');
  const hash = createHash('sha512');
  let bytes = 0;
  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk);
    hash.update(buffer);
    bytes += buffer.length;
  }
  return { bytes, sha512: hash.digest('base64') };
}

export async function verifyPublicUpdateFeed({ feedUrl, metadataName, fetchImpl = fetch }) {
  const base = assertFeedUrl(feedUrl);
  if (metadataName !== 'latest-mac.yml' && metadataName !== 'latest.yml') {
    throw new Error('metadataName 只能是 latest-mac.yml 或 latest.yml');
  }
  const metadataUrl = new URL(metadataName, base);
  const metadataGetResponse = await fetchImpl(metadataUrl, { method: 'GET', redirect: 'follow' });
  const metadataText = await metadataGetResponse.text();
  const metadataHeadResponse = await fetchImpl(metadataUrl, { method: 'HEAD', redirect: 'follow' });
  const metadata = load(metadataText);
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('公网更新 metadata 格式无效');
  }
  const artifact = safeFilename(metadata.path);
  const artifactUrl = new URL(artifact, base);
  const artifactHeadResponse = await fetchImpl(artifactUrl, { method: 'HEAD', redirect: 'follow' });
  const artifactRangeResponse = await fetchImpl(artifactUrl, {
    method: 'GET',
    headers: { Range: 'bytes=0-0' },
    redirect: 'follow',
  });
  const rangeBody = Buffer.from(await artifactRangeResponse.arrayBuffer());
  assertUpdateFeedHttpContract({
    metadataGet: evidence(metadataGetResponse, Buffer.byteLength(metadataText)),
    metadataHead: evidence(metadataHeadResponse, 0),
    artifactHead: evidence(artifactHeadResponse, 0),
    artifactRange: evidence(artifactRangeResponse, rangeBody.length),
  });

  const fileEntry = Array.isArray(metadata.files)
    ? metadata.files.find((entry) => entry && typeof entry === 'object' && entry.url === artifact)
    : undefined;
  if (!fileEntry || typeof fileEntry.sha512 !== 'string' || !Number.isSafeInteger(fileEntry.size)) {
    throw new Error('公网更新 metadata 缺少 path 对应的 hash/size');
  }
  const artifactGetResponse = await fetchImpl(artifactUrl, { method: 'GET', redirect: 'follow' });
  if (artifactGetResponse.status !== 200) throw new Error('公网更新产物 GET 必须返回 200');
  const digest = await digestResponse(artifactGetResponse);
  if (digest.bytes !== fileEntry.size || digest.sha512 !== fileEntry.sha512) {
    throw new Error('公网更新产物的长度或 sha512 与 metadata 不一致');
  }
  return { version: metadata.version, artifact, ...digest };
}

function cliOption(argv, key) {
  const prefix = `--${key}=`;
  return argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) {
  const feedUrl = cliOption(process.argv.slice(2), 'feed-url');
  const metadataName = cliOption(process.argv.slice(2), 'metadata');
  if (!feedUrl || !metadataName) {
    throw new Error(
      '用法: node scripts/verify-update-feed.mjs --feed-url=https://.../ --metadata=latest-mac.yml',
    );
  }
  process.stdout.write(`${JSON.stringify(await verifyPublicUpdateFeed({ feedUrl, metadataName }))}\n`);
}
