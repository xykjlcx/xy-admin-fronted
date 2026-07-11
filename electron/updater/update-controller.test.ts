import { describe, expect, test, vi } from 'vitest';
import type { UpdateSnapshot } from '../shared/schemas';
import {
  createUpdateController,
  UpdateCommandError,
  type CancellationPort,
  type UpdateInfoPort,
  type UpdaterEventMap,
  type UpdaterPort,
} from './update-controller';

const currentVersion = '0.1.0';
const nextInfo: UpdateInfoPort = {
  version: '0.2.0',
  releaseDate: '2026-07-11T00:00:00.000Z',
  releaseNotes: 'Security\nStability',
  files: [{ size: 1024 }, { size: 2048 }],
};

class FakeUpdater implements UpdaterPort {
  readonly listeners = new Map<keyof UpdaterEventMap, Set<(...args: unknown[]) => void>>();
  readonly checkForUpdates = vi.fn<UpdaterPort['checkForUpdates']>();
  readonly downloadUpdate = vi.fn<UpdaterPort['downloadUpdate']>();
  readonly quitAndInstall = vi.fn<UpdaterPort['quitAndInstall']>();

  on<Event extends keyof UpdaterEventMap>(event: Event, listener: UpdaterEventMap[Event]): void {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener as (...args: unknown[]) => void);
    this.listeners.set(event, listeners);
  }

  off<Event extends keyof UpdaterEventMap>(event: Event, listener: UpdaterEventMap[Event]): void {
    this.listeners.get(event)?.delete(listener as (...args: unknown[]) => void);
  }

  emit<Event extends keyof UpdaterEventMap>(event: Event, ...args: Parameters<UpdaterEventMap[Event]>): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...(args as unknown[]));
  }
}

function createHarness() {
  const updater = new FakeUpdater();
  const events: UpdateSnapshot[] = [];
  const cancellationTokens: Array<CancellationPort & { cancelled: boolean }> = [];
  const writePendingMarker = vi.fn().mockResolvedValue(undefined);
  const prepareForInstall = vi.fn().mockResolvedValue(undefined);
  let operation = 0;
  const controller = createUpdateController({
    currentVersion,
    updater,
    createOperationId: () => `00000000-0000-4000-8000-${String(++operation).padStart(12, '0')}`,
    createCancellationToken: () => {
      const token = {
        cancelled: false,
        cancel() {
          token.cancelled = true;
        },
      };
      cancellationTokens.push(token);
      return token;
    },
    writePendingMarker,
    prepareForInstall,
    publish: (snapshot) => events.push(snapshot),
  });
  return { updater, events, cancellationTokens, writePendingMarker, prepareForInstall, controller };
}

describe('update controller', () => {
  test('publishes a stable idle snapshot and binds each updater listener exactly once', () => {
    const { updater, controller } = createHarness();
    expect(controller.getSnapshot()).toEqual({
      status: 'idle',
      currentVersion,
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
    });
    expect([...updater.listeners.values()].every((listeners) => listeners.size === 1)).toBe(true);
    expect(updater.listeners.size).toBe(6);

    controller.dispose();
    expect([...updater.listeners.values()].every((listeners) => listeners.size === 0)).toBe(true);
  });

  test('reuses one check Promise and accepts only a higher stable SemVer', async () => {
    const { updater, controller } = createHarness();
    let resolveCheck:
      ((value: { isUpdateAvailable: boolean; updateInfo: UpdateInfoPort }) => void) | undefined;
    updater.checkForUpdates.mockReturnValue(
      new Promise((resolve) => {
        resolveCheck = resolve;
      }),
    );

    const first = controller.check();
    const second = controller.check();
    expect(second).toBe(first);
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({ status: 'checking', lastCommand: 'check' });
    resolveCheck?.({ isUpdateAvailable: true, updateInfo: nextInfo });
    await expect(first).resolves.toMatchObject({
      status: 'available',
      targetVersion: '0.2.0',
      packageSize: 3072,
    });

    updater.checkForUpdates.mockResolvedValueOnce({
      isUpdateAvailable: true,
      updateInfo: { ...nextInfo, version: '0.1.0' },
    });
    await expect(controller.check()).resolves.toMatchObject({ status: 'upToDate' });
    updater.checkForUpdates.mockResolvedValueOnce({
      isUpdateAvailable: true,
      updateInfo: { ...nextInfo, version: '0.3.0-beta.1' },
    });
    await expect(controller.check()).resolves.toMatchObject({
      status: 'error',
      errorCode: 'INVALID_UPDATE_METADATA',
      retryable: false,
    });
  });

  test('rejects illegal commands without invoking updater side effects', async () => {
    const { updater, controller } = createHarness();
    const downloadError: unknown = await controller.download().catch((error: unknown) => error);
    expect(downloadError).toBeInstanceOf(UpdateCommandError);
    expect(downloadError).toMatchObject({
      code: 'INVALID_STATE',
      command: 'download',
      status: 'idle',
    });
    const cancelError: unknown = await controller.cancelDownload().catch((error: unknown) => error);
    expect(cancelError).toBeInstanceOf(UpdateCommandError);
    expect(cancelError).toMatchObject({
      code: 'INVALID_STATE',
      command: 'cancelDownload',
      status: 'idle',
    });
    const retryError: unknown = await controller.retry().catch((error: unknown) => error);
    expect(retryError).toBeInstanceOf(UpdateCommandError);
    expect(retryError).toMatchObject({
      code: 'INVALID_STATE',
      command: 'retry',
      status: 'idle',
    });
    expect(updater.downloadUpdate).not.toHaveBeenCalled();
    expect(updater.quitAndInstall).not.toHaveBeenCalled();
  });

  test('downloads once, publishes progress, and reaches downloaded', async () => {
    const { updater, controller, cancellationTokens } = createHarness();
    updater.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: nextInfo });
    updater.downloadUpdate.mockImplementation(async () => {
      updater.emit('download-progress', {
        percent: 25,
        transferred: 768,
        total: 3072,
        bytesPerSecond: 512,
      });
      updater.emit('update-downloaded', nextInfo);
      return ['/private/update.zip'];
    });
    await controller.check();

    await expect(controller.download()).resolves.toMatchObject({
      status: 'downloaded',
      targetVersion: '0.2.0',
      percent: 100,
    });
    expect(updater.downloadUpdate).toHaveBeenCalledWith(cancellationTokens[0]);
    expect(controller.getSnapshot()).toMatchObject({ status: 'downloaded', transferred: 3072, total: 3072 });
  });

  test('normalizes non-finite updater progress before publishing a shared snapshot', async () => {
    const { updater, controller } = createHarness();
    updater.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: nextInfo });
    let resolveDownload: ((paths: string[]) => void) | undefined;
    updater.downloadUpdate.mockReturnValue(
      new Promise((resolve) => {
        resolveDownload = resolve;
      }),
    );
    await controller.check();
    const download = controller.download();

    expect(() =>
      updater.emit('download-progress', {
        percent: Number.NaN,
        transferred: Number.POSITIVE_INFINITY,
        total: Number.NaN,
        bytesPerSecond: Number.NEGATIVE_INFINITY,
      }),
    ).not.toThrow();
    expect(controller.getSnapshot()).toMatchObject({
      status: 'downloading',
      percent: 0,
      transferred: 0,
      total: 3072,
      bytesPerSecond: 0,
    });

    resolveDownload?.([]);
    await download;
  });

  test('cancels idempotently after updater cleanup and retries the last download', async () => {
    const { updater, controller, cancellationTokens } = createHarness();
    updater.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: nextInfo });
    let rejectDownload: ((error: Error) => void) | undefined;
    updater.downloadUpdate.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectDownload = reject;
      }),
    );
    await controller.check();
    const download = controller.download();
    const firstCancel = controller.cancelDownload();
    const secondCancel = controller.cancelDownload();
    expect(secondCancel).toBe(firstCancel);
    expect(cancellationTokens[0]?.cancelled).toBe(true);
    expect(controller.getSnapshot().status).toBe('downloading');
    rejectDownload?.(new Error('cancelled by user'));
    await expect(download).resolves.toMatchObject({ status: 'cancelled', retryable: true });
    await expect(firstCancel).resolves.toMatchObject({ status: 'cancelled' });

    updater.downloadUpdate.mockImplementationOnce(async () => {
      updater.emit('update-downloaded', nextInfo);
      return ['/private/update.zip'];
    });
    await expect(controller.retry()).resolves.toMatchObject({ status: 'downloaded' });
    expect(updater.downloadUpdate).toHaveBeenCalledTimes(2);
  });

  test('maps raw errors to non-sensitive codes and retries a failed check', async () => {
    const { updater, controller } = createHarness();
    updater.checkForUpdates.mockRejectedValueOnce(
      new Error('GET https://updates.example.com/?signed=secret-token failed'),
    );
    await expect(controller.check()).resolves.toMatchObject({
      status: 'error',
      lastCommand: 'check',
      retryable: true,
      errorCode: 'UPDATE_CHECK_FAILED',
    });
    expect(JSON.stringify(controller.getSnapshot())).not.toContain('secret-token');

    updater.checkForUpdates.mockResolvedValueOnce({ isUpdateAvailable: false, updateInfo: nextInfo });
    await expect(controller.retry()).resolves.toMatchObject({ status: 'upToDate' });
  });

  test('writes the pending marker before accepting install and reuses the first install Promise', async () => {
    const { updater, controller, writePendingMarker, prepareForInstall } = createHarness();
    updater.checkForUpdates.mockResolvedValue({ isUpdateAvailable: true, updateInfo: nextInfo });
    updater.downloadUpdate.mockImplementation(async () => {
      updater.emit('update-downloaded', nextInfo);
      return ['/private/update.zip'];
    });
    await controller.check();
    await controller.download();

    const first = controller.install();
    const second = controller.install();
    expect(second).toBe(first);
    await expect(first).resolves.toMatchObject({ status: 'installing', lastCommand: 'install' });
    expect(writePendingMarker).toHaveBeenCalledWith({ fromVersion: '0.1.0', toVersion: '0.2.0' });
    expect(writePendingMarker.mock.invocationCallOrder[0]).toBeLessThan(
      prepareForInstall.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
    expect(prepareForInstall.mock.invocationCallOrder[0]).toBeLessThan(
      updater.quitAndInstall.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
    expect(updater.quitAndInstall).toHaveBeenCalledTimes(1);
  });
});
