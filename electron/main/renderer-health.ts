export const rendererRecoveryUrl = 'app://renderer/electron/renderer/recovery.html';
export const rendererRecoveryLogUrl = 'app://recovery/open-logs';

export function isHealthyRendererUrl(urlValue: string, developmentUrl: string | null): boolean {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return false;
  }
  if (developmentUrl) return url.origin === new URL(developmentUrl).origin;
  return url.protocol === 'app:' && url.hostname === 'renderer' && url.pathname === '/index.html';
}

export function shouldShowRendererRecovery(input: {
  errorCode: number;
  isMainFrame: boolean;
  failedUrl: string;
}): boolean {
  if (!input.isMainFrame || input.errorCode === -3) return false;
  try {
    const failedUrl = new URL(input.failedUrl);
    const recoveryUrl = new URL(rendererRecoveryUrl);
    return failedUrl.origin !== recoveryUrl.origin || failedUrl.pathname !== recoveryUrl.pathname;
  } catch {
    return true;
  }
}
