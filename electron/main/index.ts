import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, clipboard, dialog, net, protocol, session, shell } from 'electron';
import { getDesktopEnvironment, readRendererDevelopmentUrl } from '../config';
import { createWindowOptions } from './create-window';
import { registerDesktopIpcHandlers } from './ipc';
import { decideNavigation } from './navigation-policy';
import { buildRendererCsp, resolveRendererAssetPath } from './protocol';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const environment = getDesktopEnvironment();
const rendererRoot = path.join(app.getAppPath(), 'out/renderer');
const allowedExternalHosts = new Set([new URL(environment.webPublicBaseUrl).hostname]);
let mainWindow: BrowserWindow | null = null;

function registerRendererProtocol(): void {
  protocol.handle('app', async (request) => {
    const assetPath = resolveRendererAssetPath(request.url, rendererRoot);
    if (!existsSync(assetPath)) return new Response('Not found', { status: 404 });

    const assetResponse = await net.fetch(pathToFileURL(assetPath).toString());
    const headers = new Headers(assetResponse.headers);
    headers.set('Content-Security-Policy', buildRendererCsp(environment.apiBaseUrl));
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  });
}

function attachNavigationPolicy(window: BrowserWindow): void {
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.on('will-navigate', (event, targetUrl) => {
    const decision = decideNavigation(targetUrl, allowedExternalHosts);
    if (decision === 'allow-internal') return;
    event.preventDefault();
    if (decision === 'open-external') void shell.openExternal(targetUrl);
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (decideNavigation(url, allowedExternalHosts) === 'open-external') void shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createMainWindow(): BrowserWindow {
  if (process.platform !== 'darwin' && process.platform !== 'win32') {
    throw new Error(`不支持的桌面平台: ${process.platform}`);
  }
  const window = new BrowserWindow(
    createWindowOptions({
      platform: process.platform,
      windowChrome: environment.windowChrome,
      preloadPath: path.join(import.meta.dirname, '../preload/index.cjs'),
    }),
  );
  attachNavigationPolicy(window);
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null;
  });

  const developmentUrl = readRendererDevelopmentUrl();
  const targetUrl = developmentUrl ?? 'app://renderer/index.html#/admin/dashboard';
  void window.loadURL(targetUrl);
  return window;
}

function registerSecurityPolicies(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) =>
    callback(false),
  );
  app.on('certificate-error', (event, _webContents, urlValue, _error, _certificate, callback) => {
    const url = new URL(urlValue);
    if (environment.allowInsecureLocalhost && url.hostname === 'localhost') {
      event.preventDefault();
      callback(true);
      return;
    }
    callback(false);
  });
}

async function startApplication(): Promise<void> {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  await app.whenReady();
  registerRendererProtocol();
  registerSecurityPolicies();
  const disposeIpc = registerDesktopIpcHandlers({
    writeClipboardText: (text) => clipboard.writeText(text),
    openExternal: (url) => shell.openExternal(url),
    allowedExternalHosts,
  });
  app.once('before-quit', disposeIpc);
  mainWindow = createMainWindow();

  app.on('activate', () => {
    if (!mainWindow) mainWindow = createMainWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

void startApplication().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : '未知启动错误';
  dialog.showErrorBox('应用启动失败', message);
  app.exit(1);
});
