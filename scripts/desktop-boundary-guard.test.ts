import { describe, expect, test } from 'vitest';
import { findDesktopBoundaryViolations } from './desktop-boundary-guard.mjs';

describe('desktop architecture guard', () => {
  test('detects Electron and Node leakage into Renderer business source', () => {
    const violations = findDesktopBoundaryViolations(
      new Map([
        ['src/modules/orders/index.ts', "import { ipcRenderer } from 'electron';\nimport fs from 'node:fs';"],
        ['src/app/Shell.tsx', 'window.desktop.files.save();'],
      ]),
    );

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('src/modules/orders/index.ts: src/** 禁止 Electron import'),
        expect.stringContaining('src/modules/orders/index.ts: src/** 禁止 Node built-in import'),
        expect.stringContaining('src/app/Shell.tsx: window.desktop 只能出现在平台适配层'),
      ]),
    );
  });

  test('detects business, React, environment, and arbitrary IPC leakage in Electron source', () => {
    const violations = findDesktopBoundaryViolations(
      new Map([
        [
          'electron/main/leaky.ts',
          "import React from 'react';\nimport { users } from '@/modules/admin/users';\nprocess.env.API_KEY;\nipcRenderer.send('anything');",
        ],
      ]),
    );

    expect(violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('electron/main/leaky.ts: electron/** 禁止业务或 React import'),
        expect.stringContaining('electron/main/leaky.ts: process.env 只能由 electron/config/index.ts 读取'),
        expect.stringContaining('electron/main/leaky.ts: ipcRenderer 只能由 Preload 白名单调用'),
      ]),
    );
  });

  test('rejects raw or event-style IPC even inside Preload', () => {
    const violations = findDesktopBoundaryViolations(
      new Map([
        [
          'electron/preload/leaky.ts',
          "ipcRenderer.send('raw-channel');\nipcRenderer.on('raw-event', () => undefined);\nipcRenderer.invoke('raw-invoke');",
        ],
      ]),
    );

    expect(violations).toEqual([
      'electron/preload/leaky.ts: Preload 只能通过 ipcChannels 调用 invoke，禁止暴露任意 IPC',
    ]);
  });

  test('allows setToken only inside the auth store and SessionCredentialService', () => {
    const violations = findDesktopBoundaryViolations(
      new Map([
        ['src/lib/reset-auth.ts', 'useAuth.getState().setToken(token);'],
        ['src/lib/session-credential-service.ts', 'dependencies.auth.setToken(token);'],
        ['src/stores/auth.ts', 'setToken: (token) => set({ token })'],
      ]),
    );

    expect(violations).toEqual(['src/lib/reset-auth.ts: setToken 只能由 SessionCredentialService 修改']);
  });

  test('allows credential adapter access only inside SessionCredentialService and platform adapters', () => {
    const violations = findDesktopBoundaryViolations(
      new Map([
        ['src/modules/admin/auth/list/LoginScene.tsx', 'await platform.credentials.persist(token);'],
        ['src/lib/session-credential-service.ts', 'credentials: platform.credentials'],
        ['src/lib/platform/desktop.ts', 'credentials: { restore: () => api.credentials.restore() }'],
        ['src/lib/platform/web.ts', 'credentials: { restore: async () => null }'],
      ]),
    );

    expect(violations).toEqual([
      'src/modules/admin/auth/list/LoginScene.tsx: credential adapter 只能由 SessionCredentialService 调用',
    ]);
  });

  test('allows window host state only in the App and Shell layers', () => {
    const violations = findDesktopBoundaryViolations(
      new Map([
        ['src/modules/admin/users/list/MembersScene.tsx', 'platform.window.getSnapshot();'],
        ['src/app/host-window.ts', 'platform.window.getSnapshot();'],
        ['src/app/shell/Shell.tsx', 'platform.window.getSnapshot();'],
      ]),
    );

    expect(violations).toEqual([
      'src/modules/admin/users/list/MembersScene.tsx: window platform 只能由 App/Shell 消费',
    ]);
  });

  test('keeps host URL and legacy browser downloads out of the file business module', () => {
    const violations = findDesktopBoundaryViolations(
      new Map([
        [
          'src/modules/admin/files/list/FilesScene.tsx',
          "import { downloadFile } from '@/lib/download';\nconst url = window.location.origin;\ndownloadFile(url, 'x');",
        ],
        ['src/lib/platform/web.ts', 'const base = window.location.origin;'],
      ]),
    );

    expect(violations).toEqual([
      'src/modules/admin/files/list/FilesScene.tsx: 文件业务必须通过 platform.files 使用宿主能力',
      'src/modules/admin/files/list/FilesScene.tsx: 分享链接不得读取宿主 window.location.origin',
    ]);
  });

  test('allows updater capability only in the App Shell host UI', () => {
    const violations = findDesktopBoundaryViolations(
      new Map([
        ['src/modules/admin/dashboard/list/DashboardScene.tsx', 'platform.updater.check();'],
        ['src/app/shell/widgets/UpdateStatus.tsx', 'platform.updater.check();'],
        ['src/lib/platform/desktop.ts', "updater: { check: () => api.updater.command('check') }"],
      ]),
    );

    expect(violations).toEqual([
      'src/modules/admin/dashboard/list/DashboardScene.tsx: updater platform 只能由 App/Shell 消费',
    ]);
  });

  test('allows the designated config, preload, and Renderer platform adapter boundaries', () => {
    expect(
      findDesktopBoundaryViolations(
        new Map([
          ['electron/config/index.ts', 'const value = process.env.DESKTOP_WINDOW_CHROME;'],
          ['electron/preload/index.ts', "import { ipcRenderer } from 'electron';"],
          ['src/lib/platform/desktop.ts', 'const api = window.desktop;'],
          ['src/lib/platform/__tests__/desktop.test.ts', 'window.desktop = fakeApi;'],
        ]),
      ),
    ).toEqual([]);
  });
});
