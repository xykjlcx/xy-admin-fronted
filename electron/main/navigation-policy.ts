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

export function assertTrustedSender(senderUrl: string): void {
  const url = parseUrl(senderUrl);
  if (!url || !isRendererDocument(url)) throw new Error('拒绝非 Renderer IPC sender');
}
