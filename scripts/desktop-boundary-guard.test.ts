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
