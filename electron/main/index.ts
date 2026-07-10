import { existsSync } from 'node:fs';
import { statfs } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  net,
  protocol,
  safeStorage,
  screen,
  session,
  shell,
} from 'electron';
import {
  getDesktopEnvironment,
  readRendererDevelopmentUrl,
  readSpikeDownloadPathValue,
  readSpikeUserDataPathValue,
} from '../config';
import { createWindowOptions } from './create-window';
import { createAtomicCredentialFileStore, createCredentialVault } from './credential-vault';
import { createDownloadManager } from './download-manager';
import { requestDownloadWithElectronNet } from './download-net';
import { registerDesktopIpcHandlers } from './ipc';
import { decideNavigation } from './navigation-policy';
import { buildRendererCsp, resolveRendererAssetPath } from './protocol';
import { parseSpikeDownloadPath, parseSpikeUserDataPath } from './spike-user-data';
import { bindWindowState } from './window-state';
import { ipcEvents } from '../shared/ipc-channels';
import { FileDownloadEventSchema } from '../shared/schemas';

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
const spikeUserDataPath = parseSpikeUserDataPath(readSpikeUserDataPathValue(), environment.spikeMode);
if (spikeUserDataPath) app.setPath('userData', spikeUserDataPath);
const spikeDownloadPath = parseSpikeDownloadPath(
  readSpikeDownloadPathValue(),
  environment.spikeMode,
  app.getPath('userData'),
);
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
  const disposeWindowState = bindWindowState({
    window,
    displaySource: screen,
    platform: process.platform,
    chrome: environment.windowChrome,
  });
  attachNavigationPolicy(window);
  window.once('ready-to-show', () => window.show());
  // webContents 销毁前解绑；在 closed 后访问已销毁 webContents 会阻塞 Playwright/app.quit 清理。
  window.once('close', disposeWindowState);
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
  if (environment.allowInsecureLocalhost) {
    // 仅 packaged Spike 显式启用：Main `net` 不依赖 Renderer 的 certificate-error 回调，
    // 因此用 session verifier 接受 localhost 自签名证书，并明确拒绝其他 host。
    session.defaultSession.setCertificateVerifyProc((request, callback) =>
      callback(request.hostname === 'localhost' ? 0 : -2),
    );
  }
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

async function availableDiskBytes(directory: string): Promise<number> {
  const stats = await statfs(directory, { bigint: true });
  const bytes = stats.bavail * stats.bsize;
  return bytes > BigInt(Number.MAX_SAFE_INTEGER) ? Number.MAX_SAFE_INTEGER : Number(bytes);
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
  const credentialVault = createCredentialVault({
    crypto: {
      isAvailable: () => safeStorage.isAsyncEncryptionAvailable(),
      encrypt: (plainText) => safeStorage.encryptStringAsync(plainText),
      decrypt: (ciphertext) => safeStorage.decryptStringAsync(ciphertext),
    },
    storage: createAtomicCredentialFileStore(
      path.join(app.getPath('userData'), 'credentials', 'session.bin'),
    ),
  });
  try {
    await credentialVault.restore();
  } catch {
    // 安全存储不可用或密文损坏时按无会话启动，禁止回退明文。
    console.error('Credential vault restore failed; starting without a session');
  }
  const downloadManager = createDownloadManager({
    apiBaseUrl: environment.apiBaseUrl,
    approvedOrigins: new Set([environment.apiOrigin, ...environment.downloadAllowedOrigins]),
    allowInsecureApi: environment.mode === 'development',
    restoreCredential: () => credentialVault.restore(),
    showSaveDialog: async (suggestedName) => {
      if (spikeDownloadPath) return spikeDownloadPath;
      const result = await dialog.showSaveDialog({
        defaultPath: path.join(app.getPath('downloads'), suggestedName),
        properties: ['createDirectory', 'showOverwriteConfirmation'],
      });
      return result.canceled ? null : (result.filePath ?? null);
    },
    request: requestDownloadWithElectronNet,
    availableBytes: availableDiskBytes,
    emit: (event) => {
      const payload = FileDownloadEventSchema.parse(event);
      for (const window of BrowserWindow.getAllWindows()) {
        if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
          window.webContents.send(ipcEvents.fileDownloadChanged, payload);
        }
      }
    },
  });
  const disposeIpc = registerDesktopIpcHandlers({
    writeClipboardText: (text) => clipboard.writeText(text),
    openExternal: (url) => shell.openExternal(url),
    allowedExternalHosts,
    credentials: credentialVault,
    files: downloadManager,
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
