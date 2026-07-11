import { expect, test, vi } from 'vitest';
import { createSpikeUpdaterHarness } from './spike-updater';

test('provides deterministic packaged updater events without contacting a feed', async () => {
  const harness = createSpikeUpdaterHarness('0.1.0');
  const available = vi.fn();
  const progress = vi.fn();
  const downloaded = vi.fn();
  harness.port.on('update-available', available);
  harness.port.on('download-progress', progress);
  harness.port.on('update-downloaded', downloaded);

  await expect(harness.port.checkForUpdates()).resolves.toMatchObject({
    isUpdateAvailable: true,
    updateInfo: { version: '0.1.1' },
  });
  const cancellation = harness.createCancellationToken();
  await expect(harness.port.downloadUpdate(cancellation)).resolves.toEqual([]);
  expect(available).toHaveBeenCalledOnce();
  expect(progress).toHaveBeenCalledWith(expect.objectContaining({ percent: 100 }));
  expect(downloaded).toHaveBeenCalledOnce();
  expect(harness.installRequested()).toBe(false);
  harness.port.quitAndInstall();
  expect(harness.installRequested()).toBe(true);
});

test('emits cancellation only after the deterministic download observes the token', async () => {
  const harness = createSpikeUpdaterHarness('0.1.0');
  const cancelled = vi.fn();
  harness.port.on('update-cancelled', cancelled);
  await harness.port.checkForUpdates();
  const token = harness.createCancellationToken();
  const download = harness.port.downloadUpdate(token);
  token.cancel();
  await expect(download).rejects.toThrow('cancelled');
  expect(cancelled).toHaveBeenCalledOnce();
});
