import { expect, test, vi } from 'vitest';
import {
  configureElectronUpdater,
  createElectronCancellationPort,
  type ElectronUpdaterLike,
} from './electron-updater-port';

test('configures a credential-free manual generic updater and delegates semantic operations', async () => {
  const updater = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: true,
    allowDowngrade: true,
    requestHeaders: { Authorization: 'must-be-removed' },
    setFeedURL: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    checkForUpdates: vi.fn().mockResolvedValue(null),
    downloadUpdate: vi.fn().mockResolvedValue(['/tmp/update.zip']),
    quitAndInstall: vi.fn(),
  } satisfies ElectronUpdaterLike;

  const port = configureElectronUpdater(updater, 'https://updates.example.com/stable/darwin/arm64/');
  expect(updater).toMatchObject({
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: false,
    allowDowngrade: false,
    requestHeaders: null,
  });
  expect(updater.setFeedURL).toHaveBeenCalledWith({
    provider: 'generic',
    url: 'https://updates.example.com/stable/darwin/arm64/',
  });

  const listener = vi.fn();
  port.on('error', listener);
  port.off('error', listener);
  expect(updater.on).toHaveBeenCalledWith('error', listener);
  expect(updater.off).toHaveBeenCalledWith('error', listener);
  await expect(port.checkForUpdates()).resolves.toBeNull();
  const cancellation = createElectronCancellationPort();
  await expect(port.downloadUpdate(cancellation)).resolves.toEqual(['/tmp/update.zip']);
  expect(updater.downloadUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ cancel: expect.any(Function) }),
  );
  port.quitAndInstall();
  expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true);
});
