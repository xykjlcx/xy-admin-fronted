import path from 'node:path';

const rendererScheme = 'app:';
const rendererHost = 'renderer';
const encodedDotSegment = /(?:^|\/)(?:%2e|\.){1,2}(?:\/|$)/i;
const allowedRendererExtensions = new Set([
  '.html',
  '.js',
  '.css',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
]);

function rejectRendererRequest(): never {
  throw new Error('非法 Renderer 资源请求');
}

export function resolveRendererAssetPath(requestUrl: string, rendererRoot: string): string {
  if (encodedDotSegment.test(requestUrl) || requestUrl.includes('\\') || requestUrl.includes('\0')) {
    rejectRendererRequest();
  }

  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    rejectRendererRequest();
  }

  if (
    url.protocol !== rendererScheme ||
    url.hostname !== rendererHost ||
    url.username ||
    url.password ||
    url.port
  ) {
    rejectRendererRequest();
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    rejectRendererRequest();
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (!relativePath || relativePath.split('/').some((segment) => segment === '..' || segment === '.')) {
    rejectRendererRequest();
  }
  if (!allowedRendererExtensions.has(path.extname(relativePath).toLowerCase())) rejectRendererRequest();

  const normalizedRoot = path.resolve(rendererRoot);
  const assetPath = path.resolve(normalizedRoot, relativePath);
  if (assetPath !== normalizedRoot && !assetPath.startsWith(`${normalizedRoot}${path.sep}`))
    rejectRendererRequest();

  return assetPath;
}

export function buildRendererCsp(apiBaseUrl: string): string {
  const apiOrigin = new URL(apiBaseUrl);
  if (apiOrigin.protocol !== 'https:') throw new Error('Renderer API 必须使用 HTTPS');

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src-elem 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin.origin}`,
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');
}
