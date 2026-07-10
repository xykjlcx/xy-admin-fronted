function header(response, name) {
  const target = name.toLowerCase();
  const entry = Object.entries(response.headers).find(([key]) => key.toLowerCase() === target);
  return entry?.[1]?.trim() ?? '';
}

function positiveLength(response, label, errors) {
  const value = header(response, 'content-length');
  if (!/^\d+$/.test(value) || Number(value) <= 0) {
    errors.push(`${label} 缺少有效 Content-Length`);
    return null;
  }
  return Number(value);
}

export function assertUpdateFeedHttpContract(evidence) {
  const errors = [];
  const { metadataGet, metadataHead, artifactHead, artifactRange } = evidence;

  if (metadataGet.status !== 200) errors.push('metadata GET 必须返回 200');
  if (metadataHead.status !== 200) errors.push('metadata HEAD 必须返回 200');
  const metadataLength = positiveLength(metadataGet, 'metadata GET', errors);
  const metadataHeadLength = positiveLength(metadataHead, 'metadata HEAD', errors);
  if (metadataLength !== null && metadataGet.bodyLength !== metadataLength) {
    errors.push('metadata GET body 与 Content-Length 不一致');
  }
  if (metadataLength !== null && metadataHeadLength !== null && metadataLength !== metadataHeadLength) {
    errors.push('metadata GET/HEAD Content-Length 不一致');
  }
  const metadataType = header(metadataGet, 'content-type').toLowerCase();
  if (!/(?:application|text)\/(?:x-)?ya?ml/.test(metadataType)) {
    errors.push('metadata Content-Type 必须是 YAML');
  }
  const metadataCache = header(metadataGet, 'cache-control').toLowerCase();
  if (!metadataCache.includes('no-cache') || !metadataCache.includes('no-store')) {
    errors.push('metadata Cache-Control 必须禁止缓存');
  }

  if (artifactHead.status !== 200) errors.push('artifact HEAD 必须返回 200');
  const artifactLength = positiveLength(artifactHead, 'artifact HEAD', errors);
  const artifactType = header(artifactHead, 'content-type').toLowerCase();
  if (!artifactType || artifactType.includes('text/html')) errors.push('artifact Content-Type 无效');
  const artifactCache = header(artifactHead, 'cache-control').toLowerCase();
  if (!artifactCache.includes('immutable') || !/max-age=(?:[1-9]\d{5,}|31536000)/.test(artifactCache)) {
    errors.push('artifact Cache-Control 必须长期 immutable');
  }
  if (header(artifactHead, 'accept-ranges').toLowerCase() !== 'bytes') {
    errors.push('artifact 必须声明 Accept-Ranges: bytes');
  }

  if (artifactRange.status !== 206) errors.push('artifact Range GET 必须返回 206');
  if (header(artifactRange, 'content-length') !== '1' || artifactRange.bodyLength !== 1) {
    errors.push('artifact 单字节 Range 长度无效');
  }
  if (
    artifactLength !== null &&
    header(artifactRange, 'content-range') !== `bytes 0-0/${String(artifactLength)}`
  ) {
    errors.push('artifact Content-Range 无效');
  }

  if (errors.length > 0) throw new Error(`更新源 HTTP 契约失败: ${errors.join('；')}`);
}
