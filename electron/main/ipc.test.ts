import { describe, expect, test, vi } from 'vitest';
import { ipcChannels } from '../shared/ipc-channels';
import { createDesktopIpcHandlers } from './ipc';

const trustedEvent = { senderFrame: { url: 'app://renderer/index.html#/admin/dashboard' } };
const untrustedEvent = { senderFrame: { url: 'https://evil.example.com' } };
const idleUpdateSnapshot = {
  status: 'idle',
  currentVersion: '0.1.0',
  operationId: null,
  lastCommand: null,
  retryable: false,
  targetVersion: null,
  releaseDate: null,
  releaseNotes: null,
  packageSize: null,
  transferred: 0,
  total: 0,
  percent: 0,
  bytesPerSecond: 0,
  errorCode: null,
} as const;

const updaterDependencies = () => ({
  getSnapshot: vi.fn(() => idleUpdateSnapshot),
  execute: vi.fn().mockResolvedValue(idleUpdateSnapshot),
});

describe('desktop IPC handlers', () => {
  test('validates sender and payload before writing clipboard text', async () => {
    const writeClipboardText = vi.fn();
    const handlers = createDesktopIpcHandlers({
      writeClipboardText,
      openExternal: vi.fn(),
      allowedExternalHosts: new Set(['docs.example.com']),
      credentials: { restore: vi.fn(), persist: vi.fn(), clear: vi.fn() },
      files: { start: vi.fn(), cancel: vi.fn() },
      updater: updaterDependencies(),
    });

    await expect(handlers[ipcChannels.clipboardWrite](trustedEvent, { text: 'copied' })).resolves.toEqual({
      ok: true,
    });
    expect(writeClipboardText).toHaveBeenCalledWith('copied');
    await expect(handlers[ipcChannels.clipboardWrite](untrustedEvent, { text: 'blocked' })).rejects.toThrow(
      '拒绝非 Renderer IPC sender',
    );
    await expect(handlers[ipcChannels.clipboardWrite](trustedEvent, { text: 42 })).rejects.toThrow();
    expect(writeClipboardText).toHaveBeenCalledTimes(1);
  });

  test('opens only an allowlisted HTTPS external host', async () => {
    const openExternal = vi.fn();
    const handlers = createDesktopIpcHandlers({
      writeClipboardText: vi.fn(),
      openExternal,
      allowedExternalHosts: new Set(['docs.example.com']),
      credentials: { restore: vi.fn(), persist: vi.fn(), clear: vi.fn() },
      files: { start: vi.fn(), cancel: vi.fn() },
      updater: updaterDependencies(),
    });

    await expect(
      handlers[ipcChannels.externalOpen](trustedEvent, { url: 'https://docs.example.com/guide' }),
    ).resolves.toEqual({ ok: true });
    await expect(
      handlers[ipcChannels.externalOpen](trustedEvent, { url: 'https://evil.example.com/guide' }),
    ).rejects.toThrow('外链 host 未授权');
    await expect(
      handlers[ipcChannels.externalOpen](trustedEvent, { url: 'file:///tmp/secret' }),
    ).rejects.toThrow();
    expect(openExternal).toHaveBeenCalledTimes(1);
  });

  test('keeps credential restore, persist, and clear behind the same sender and schema boundary', async () => {
    const credentials = {
      restore: vi.fn().mockResolvedValue('restored-token'),
      persist: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };
    const handlers = createDesktopIpcHandlers({
      writeClipboardText: vi.fn(),
      openExternal: vi.fn(),
      allowedExternalHosts: new Set(),
      credentials,
      files: { start: vi.fn(), cancel: vi.fn() },
      updater: updaterDependencies(),
    });

    await expect(handlers[ipcChannels.credentialRestore](trustedEvent, undefined)).resolves.toEqual({
      token: 'restored-token',
    });
    await expect(
      handlers[ipcChannels.credentialPersist](trustedEvent, { token: 'next-token' }),
    ).resolves.toEqual({
      ok: true,
    });
    await expect(handlers[ipcChannels.credentialClear](trustedEvent, { reason: 'logout' })).resolves.toEqual({
      ok: true,
    });
    await expect(
      handlers[ipcChannels.credentialPersist](untrustedEvent, { token: 'blocked' }),
    ).rejects.toThrow('拒绝非 Renderer IPC sender');
    expect(credentials.persist).toHaveBeenCalledWith('next-token');
    expect(credentials.clear).toHaveBeenCalledTimes(1);
  });

  test('starts and cancels downloads only after sender and descriptor validation', async () => {
    const taskId = '9ba560a3-94c6-438a-9d76-1e17627fd483';
    const files = {
      start: vi.fn().mockReturnValue({ taskId }),
      cancel: vi.fn().mockReturnValue(true),
    };
    const handlers = createDesktopIpcHandlers({
      writeClipboardText: vi.fn(),
      openExternal: vi.fn(),
      allowedExternalHosts: new Set(),
      credentials: { restore: vi.fn(), persist: vi.fn(), clear: vi.fn() },
      files,
      updater: updaterDependencies(),
    });

    await expect(
      handlers[ipcChannels.fileDownloadStart](trustedEvent, {
        resourceId: 'report-1',
        suggestedName: 'report.pdf',
      }),
    ).resolves.toEqual({ taskId });
    await expect(handlers[ipcChannels.fileDownloadCancel](trustedEvent, { taskId })).resolves.toEqual({
      ok: true,
    });
    await expect(
      handlers[ipcChannels.fileDownloadStart](trustedEvent, {
        resourceId: 'https://evil.example.com/file',
        suggestedName: 'secret',
      }),
    ).rejects.toThrow();
    await expect(
      handlers[ipcChannels.fileDownloadStart](untrustedEvent, {
        resourceId: 'report-1',
        suggestedName: 'report.pdf',
      }),
    ).rejects.toThrow('拒绝非 Renderer IPC sender');
    expect(files.start).toHaveBeenCalledTimes(1);
    expect(files.cancel).toHaveBeenCalledWith(taskId);
  });

  test('returns updater snapshots and typed domain errors across the same trusted boundary', async () => {
    const updater = updaterDependencies();
    const handlers = createDesktopIpcHandlers({
      writeClipboardText: vi.fn(),
      openExternal: vi.fn(),
      allowedExternalHosts: new Set(),
      credentials: { restore: vi.fn(), persist: vi.fn(), clear: vi.fn() },
      files: { start: vi.fn(), cancel: vi.fn() },
      updater,
    });

    await expect(handlers[ipcChannels.updaterGetSnapshot](trustedEvent, undefined)).resolves.toEqual(
      idleUpdateSnapshot,
    );
    await expect(handlers[ipcChannels.updaterCommand](trustedEvent, { command: 'check' })).resolves.toEqual({
      ok: true,
      snapshot: idleUpdateSnapshot,
    });
    expect(updater.execute).toHaveBeenCalledWith('check');

    updater.execute.mockRejectedValueOnce({
      code: 'INVALID_STATE',
      command: 'download',
      status: 'idle',
    });
    await expect(
      handlers[ipcChannels.updaterCommand](trustedEvent, { command: 'download' }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'INVALID_STATE', command: 'download', status: 'idle' },
    });
    await expect(handlers[ipcChannels.updaterCommand](untrustedEvent, { command: 'check' })).rejects.toThrow(
      '拒绝非 Renderer IPC sender',
    );
    await expect(handlers[ipcChannels.updaterCommand](trustedEvent, { command: 'force' })).rejects.toThrow();
  });
});
