import { describe, expect, test, vi } from 'vitest';
import { ipcChannels } from '../shared/ipc-channels';
import { createDesktopIpcHandlers } from './ipc';

const trustedEvent = { senderFrame: { url: 'app://renderer/index.html#/admin/dashboard' } };
const untrustedEvent = { senderFrame: { url: 'https://evil.example.com' } };

describe('desktop IPC handlers', () => {
  test('validates sender and payload before writing clipboard text', async () => {
    const writeClipboardText = vi.fn();
    const handlers = createDesktopIpcHandlers({
      writeClipboardText,
      openExternal: vi.fn(),
      allowedExternalHosts: new Set(['docs.example.com']),
      credentials: { restore: vi.fn(), persist: vi.fn(), clear: vi.fn() },
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
});
