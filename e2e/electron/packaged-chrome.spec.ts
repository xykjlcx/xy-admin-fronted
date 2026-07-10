import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { _electron as electron, expect, test, type Page } from '@playwright/test';

type ShellLayout = 'sidebar' | 'rail' | 'inset';
type Zoom = 'sm' | 'md' | 'lg';

const expectedScale: Record<Zoom, number> = { sm: 0.9, md: 1, lg: 1.08 };

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 未配置`);
  return value;
}

async function selectAppearance(page: Page, layout: ShellLayout, zoom: Zoom): Promise<void> {
  await page.evaluate(
    ({ nextLayout, nextZoom }) => {
      const raw = localStorage.getItem('appearance');
      const envelope = (raw ? JSON.parse(raw) : { state: {}, version: 0 }) as {
        state: Partial<{ layout: ShellLayout; zoom: Zoom; collapsed: Record<string, boolean> }>;
        version: number;
      };
      envelope.state.layout = nextLayout;
      envelope.state.zoom = nextZoom;
      envelope.state.collapsed = {};
      localStorage.setItem('appearance', JSON.stringify(envelope));
    },
    { nextLayout: layout, nextZoom: zoom },
  );
  await page.reload();
  await expect(page.getByText('Packaged Chrome')).toBeVisible();
  await expect(page.locator(`[data-shell-layout="${layout}"]`)).toBeVisible();
  // PageTransition 的入场动画结束后再采集视觉证据，避免把合法的首帧淡入误记为最终画面。
  await page.waitForTimeout(350);
}

test('packaged integrated chrome consumes safe areas in three Shell layouts at three scales', async () => {
  const executablePath = requiredEnvironment('SPIKE_APP_EXECUTABLE');
  const userDataPath = requiredEnvironment('SPIKE_USER_DATA_PATH');
  const screenshotRoot = path.join(process.cwd(), 'test-results/electron-chrome');
  const expectedPlatform = process.platform === 'darwin' ? 'darwin' : 'win32';
  const expectedInsets = expectedPlatform === 'darwin' ? { left: 80, right: 0 } : { left: 0, right: 138 };
  mkdirSync(screenshotRoot, { recursive: true });
  const desktop = await electron.launch({
    executablePath,
    args: [`--user-data-dir=${userDataPath}`],
    cwd: process.cwd(),
    env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
  });

  try {
    const page = await desktop.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
    await page.locator('#login-username').fill('chrome-user');
    await page.locator('#login-password').fill('spike-password');
    await page.getByRole('button', { name: /^登录/ }).click();
    await expect(page.getByText('Packaged Chrome')).toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(() => ({
          runtime: document.documentElement.dataset.runtime,
          chrome: document.documentElement.dataset.windowChrome,
          platform: document.documentElement.dataset.platform,
          left: getComputedStyle(document.documentElement)
            .getPropertyValue('--window-controls-inset-left')
            .trim(),
          right: getComputedStyle(document.documentElement)
            .getPropertyValue('--window-controls-inset-right')
            .trim(),
          titlebar: getComputedStyle(document.documentElement)
            .getPropertyValue('--desktop-titlebar-height')
            .trim(),
        })),
      )
      .toEqual({
        runtime: 'desktop',
        chrome: 'integrated',
        platform: expectedPlatform,
        left: `${String(expectedInsets.left)}px`,
        right: `${String(expectedInsets.right)}px`,
        titlebar: '56px',
      });

    for (const layout of ['sidebar', 'rail', 'inset'] as const) {
      for (const zoom of ['sm', 'md', 'lg'] as const) {
        await selectAppearance(page, layout, zoom);
        const geometry = await page.evaluate((activeLayout) => {
          const rootStyle = getComputedStyle(document.documentElement);
          const controlsInsetLeft = Number.parseFloat(
            rootStyle.getPropertyValue('--window-controls-inset-left'),
          );
          const titlebarHeight = Number.parseFloat(rootStyle.getPropertyValue('--desktop-titlebar-height'));
          const controlsInsetRight = Number.parseFloat(
            rootStyle.getPropertyValue('--window-controls-inset-right'),
          );
          const firstInteractive =
            activeLayout === 'sidebar'
              ? document.querySelector('[data-slot="shell-header-left"] button')
              : activeLayout === 'rail'
                ? document.querySelector('[data-shell-layout="rail"] nav button')
                : document.querySelector('[data-slot="inset-window-brand"] button');
          const bounds = firstInteractive?.getBoundingClientRect();
          const rightConsumer = document.querySelector(
            activeLayout === 'inset'
              ? '[data-slot="inset-shell-header-suffix"]'
              : '[data-slot="shell-header-right"]',
          );
          const rightBounds = rightConsumer?.getBoundingClientRect();
          return {
            appScale: Number.parseFloat(rootStyle.getPropertyValue('--app-scale')),
            controlsInsetLeft,
            controlsInsetRight,
            titlebarHeight,
            interactiveLeft: bounds?.left ?? -1,
            interactiveTop: bounds?.top ?? -1,
            rightConsumerEdge: rightBounds?.right ?? -1,
            viewportWidth: document.documentElement.clientWidth,
            horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          };
        }, layout);

        expect(geometry.appScale).toBeCloseTo(expectedScale[zoom], 4);
        expect(geometry.horizontalOverflow).toBe(false);
        if (expectedPlatform === 'darwin') {
          if (layout === 'rail')
            expect(geometry.interactiveTop).toBeGreaterThanOrEqual(geometry.titlebarHeight);
          else expect(geometry.interactiveLeft).toBeGreaterThanOrEqual(geometry.controlsInsetLeft);
        } else {
          expect(geometry.rightConsumerEdge).toBeLessThanOrEqual(
            geometry.viewportWidth - geometry.controlsInsetRight,
          );
        }
        await page.screenshot({
          path: path.join(screenshotRoot, `${layout}-${zoom}.png`),
          fullPage: true,
        });
      }
    }

    const window = desktop.windows()[0];
    expect(window).toBeDefined();
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.maximize());
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.maximized)).toBe('true');
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.unmaximize());
    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.maximized)).toBe('false');

    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setFullScreen(true));
    await expect
      .poll(() =>
        page.evaluate(() => {
          const style = getComputedStyle(document.documentElement);
          return [
            style.getPropertyValue('--window-controls-inset-left').trim(),
            style.getPropertyValue('--window-controls-inset-right').trim(),
          ];
        }),
      )
      .toEqual(['0px', '0px']);
    await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.setFullScreen(false));
    await expect
      .poll(() =>
        page.evaluate(() => {
          const style = getComputedStyle(document.documentElement);
          return [
            style.getPropertyValue('--window-controls-inset-left').trim(),
            style.getPropertyValue('--window-controls-inset-right').trim(),
          ];
        }),
      )
      .toEqual([`${String(expectedInsets.left)}px`, `${String(expectedInsets.right)}px`]);
  } finally {
    await desktop.close();
  }
});
