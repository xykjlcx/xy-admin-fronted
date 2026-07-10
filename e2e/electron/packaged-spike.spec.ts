import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

interface SpikeEvidence {
  expectedOrigin: string;
  requests: Array<{
    method: string;
    path: string;
    origin: string;
    preflight: boolean;
    requestedHeaders: string;
    hasAuthorization: boolean;
  }>;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 未配置`);
  return value;
}

function readEvidence(path: string): SpikeEvidence {
  return JSON.parse(readFileSync(path, 'utf8')) as SpikeEvidence;
}

test('packaged app proves protocol, hash routing, HTTPS CORS, CSP, navigation, and 401 redirect', async () => {
  const executablePath = requiredEnvironment('SPIKE_APP_EXECUTABLE');
  const evidencePath = requiredEnvironment('SPIKE_EVIDENCE_PATH');
  const userDataPath = requiredEnvironment('SPIKE_USER_DATA_PATH');
  const expectedPlatform = process.platform === 'darwin' ? 'darwin' : 'win32';
  const desktop = await electron.launch({
    executablePath,
    args: [`--user-data-dir=${userDataPath}`],
    cwd: process.cwd(),
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
  });
  let originalClipboard: string | undefined;

  try {
    const page = await desktop.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/app:\/\/renderer\/index\.html#\/login/);
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();

    const rendererContext = await page.evaluate(() => {
      const api = (window as Window & { desktop?: { window?: { getSnapshot(): unknown } } }).desktop;
      return {
        snapshot: api?.window?.getSnapshot(),
        processType: typeof (globalThis as { process?: unknown }).process,
        requireType: typeof (globalThis as { require?: unknown }).require,
      };
    });
    expect(rendererContext).toMatchObject({
      snapshot: {
        runtime: 'desktop',
        platform: expectedPlatform,
        chrome: 'native',
        controlsInsetLeft: 0,
        controlsInsetRight: 0,
        titlebarHeight: 0,
      },
      processType: 'undefined',
      requireType: 'undefined',
    });

    originalClipboard = await desktop.evaluate(({ clipboard }) => clipboard.readText());
    await page.evaluate(async () => {
      const api = (
        window as Window & {
          desktop?: {
            clipboard: { writeText(text: string): Promise<void> };
            external: { open(url: string): Promise<void> };
          };
        }
      ).desktop;
      if (!api) throw new Error('Desktop API unavailable');
      await api.clipboard.writeText('electron-packaged-spike');
    });
    expect(await desktop.evaluate(({ clipboard }) => clipboard.readText())).toBe('electron-packaged-spike');

    await desktop.evaluate(({ shell }) => {
      const state = globalThis as typeof globalThis & { __spikeExternalUrls?: string[] };
      state.__spikeExternalUrls = [];
      shell.openExternal = async (url) => {
        state.__spikeExternalUrls?.push(url);
      };
    });
    await page.evaluate(async () => {
      const api = (window as Window & { desktop?: { external: { open(url: string): Promise<void> } } })
        .desktop;
      if (!api) throw new Error('Desktop API unavailable');
      await api.external.open('https://app.example.com/guide');
    });
    expect(
      await desktop.evaluate(
        () => (globalThis as typeof globalThis & { __spikeExternalUrls?: string[] }).__spikeExternalUrls,
      ),
    ).toEqual(['https://app.example.com/guide']);
    expect(
      await page.evaluate(async () => {
        const api = (window as Window & { desktop?: { external: { open(url: string): Promise<void> } } })
          .desktop;
        if (!api) throw new Error('Desktop API unavailable');
        try {
          await api.external.open('https://evil.example.com/guide');
          return 'allowed';
        } catch {
          return 'blocked';
        }
      }),
    ).toBe('blocked');

    const credentialPath = path.join(
      await desktop.evaluate(({ app }) => app.getPath('userData')),
      'credentials',
      'session.bin',
    );
    await page.evaluate(async () => {
      const api = (
        window as Window & {
          desktop?: {
            credentials: {
              persist(token: string): Promise<void>;
              restore(): Promise<string | null>;
            };
          };
        }
      ).desktop;
      if (!api) throw new Error('Desktop API unavailable');
      await api.credentials.persist('packaged-vault-token');
      if ((await api.credentials.restore()) !== 'packaged-vault-token') {
        throw new Error('credential restore failed');
      }
    });
    expect(existsSync(credentialPath)).toBe(true);
    expect(readFileSync(credentialPath).includes(Buffer.from('packaged-vault-token'))).toBe(false);
    expect(await page.evaluate(() => localStorage.getItem('auth'))).toBeNull();
    await page.evaluate(async () => {
      const api = (
        window as Window & {
          desktop?: { credentials: { clear(reason: 'switch-account'): Promise<void> } };
        }
      ).desktop;
      if (!api) throw new Error('Desktop API unavailable');
      await api.credentials.clear('switch-account');
    });
    expect(existsSync(credentialPath)).toBe(false);

    const documentResponsePromise = page.waitForResponse((response) =>
      response.url().startsWith('app://renderer/index.html'),
    );
    await page.reload();
    const documentResponse = await documentResponsePromise;
    const responseHeaders = await documentResponse.allHeaders();
    const csp = responseHeaders['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).not.toMatch(/script-src[^;]*(?:unsafe-inline|unsafe-eval)/);

    const resources = await page.evaluate(async () => {
      const favicon = await fetch('./favicon.svg');
      return {
        faviconStatus: favicon.status,
        urls: performance.getEntriesByType('resource').map((entry) => entry.name),
        fontFamily: getComputedStyle(document.body).fontFamily,
      };
    });
    expect(resources.faviconStatus).toBe(200);
    expect(resources.urls.some((url) => /app:\/\/renderer\/assets\/.+\.js$/.test(url))).toBe(true);
    expect(resources.urls.some((url) => /app:\/\/renderer\/assets\/.+\.css$/.test(url))).toBe(true);
    expect(resources.urls.every((url) => !url.startsWith('file:'))).toBe(true);
    expect(resources.fontFamily.length).toBeGreaterThan(0);

    await page.getByRole('button', { name: '注册' }).click();
    await expect(page).toHaveURL(/#\/register$/);
    await page.reload();
    await expect(page).toHaveURL(/#\/register$/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/login/);
    await page.goForward();
    await expect(page).toHaveURL(/#\/register$/);
    await page.goBack();

    const cspExecution = await page.evaluate(async () => {
      (globalThis as { __spikeInlineExecuted?: boolean }).__spikeInlineExecuted = false;
      const script = document.createElement('script');
      script.textContent = 'globalThis.__spikeInlineExecuted = true';
      document.head.append(script);
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      return (globalThis as { __spikeInlineExecuted?: boolean }).__spikeInlineExecuted;
    });
    expect(cspExecution).toBe(false);

    const permissionResult = await page.evaluate(async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return 'granted';
      } catch (error) {
        return error instanceof DOMException ? error.name : 'denied';
      }
    });
    expect(permissionResult).not.toBe('granted');

    await page.locator('#login-username').fill('spike-user');
    await page.locator('#login-password').fill('spike-password');
    await page.getByRole('button', { name: /^登录/ }).click();

    await expect
      .poll(
        () =>
          existsSync(evidencePath) &&
          readEvidence(evidencePath).requests.some((item) => item.path === '/api/dashboard/overview'),
      )
      .toBe(true);
    await expect(page).toHaveURL(/#\/login/);
    expect(
      await page.evaluate(() => {
        const search = window.location.hash.split('?')[1] ?? '';
        return new URLSearchParams(search).get('redirect');
      }),
    ).toBe('/admin/dashboard');

    const evidence = readEvidence(evidencePath);
    expect(new Set(evidence.requests.map((item) => item.origin))).toEqual(new Set(['app://renderer']));
    expect(
      evidence.requests.some((item) => item.preflight && item.requestedHeaders.includes('content-type')),
    ).toBe(true);
    expect(evidence.requests.some((item) => item.path === '/api/auth/me' && item.hasAuthorization)).toBe(
      true,
    );
    expect(
      evidence.requests.some((item) => item.path === '/api/dashboard/overview' && item.hasAuthorization),
    ).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('auth'))).toBeNull();
    expect(existsSync(credentialPath)).toBe(false);

    await page.evaluate(() => {
      window.location.href = 'https://evil.example.com/escape';
      window.open('https://evil.example.com/popup');
    });
    await page.waitForTimeout(200);
    expect(page.url()).toMatch(/^app:\/\/renderer\/index\.html#/);
    expect(desktop.windows()).toHaveLength(1);
  } finally {
    if (originalClipboard !== undefined) {
      await desktop.evaluate(({ clipboard }, text) => clipboard.writeText(text), originalClipboard);
    }
    await desktop.close();
  }
});
