export type NavigationDecision = 'allow-internal' | 'open-external' | 'deny';

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isRendererDocument(url: URL): boolean {
  return (
    url.protocol === 'app:' &&
    url.hostname === 'renderer' &&
    !url.username &&
    !url.password &&
    !url.port &&
    (url.pathname === '/' || url.pathname === '/index.html')
  );
}

function isDevelopmentRendererDocument(url: URL, developmentUrl: string | null): boolean {
  const expected = developmentUrl ? parseUrl(developmentUrl) : null;
  if (!expected || (expected.protocol !== 'http:' && expected.protocol !== 'https:')) return false;

  const senderDocument = new URL(url);
  senderDocument.hash = '';
  const expectedDocument = new URL(expected);
  expectedDocument.hash = '';
  return senderDocument.href === expectedDocument.href;
}

export function decideNavigation(
  targetUrl: string,
  allowedExternalHosts: ReadonlySet<string>,
): NavigationDecision {
  const url = parseUrl(targetUrl);
  if (!url) return 'deny';
  if (isRendererDocument(url)) return 'allow-internal';
  if (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    (!url.port || url.port === '443') &&
    allowedExternalHosts.has(url.hostname)
  ) {
    return 'open-external';
  }
  return 'deny';
}

export function assertTrustedSender(senderUrl: string, developmentUrl: string | null = null): void {
  const url = parseUrl(senderUrl);
  if (!url || (!isRendererDocument(url) && !isDevelopmentRendererDocument(url, developmentUrl))) {
    throw new Error('拒绝非 Renderer IPC sender');
  }
}
