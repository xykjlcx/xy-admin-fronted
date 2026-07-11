import { EventEmitter } from 'node:events';
import type { CancellationPort, UpdateInfoPort, UpdaterEventMap, UpdaterPort } from './update-controller';

class SpikeCancellationPort implements CancellationPort {
  cancelled = false;

  cancel(): void {
    this.cancelled = true;
  }
}

function nextPatchVersion(currentVersion: string): string {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(currentVersion);
  if (!match) throw new Error('Spike current version 必须是稳定 SemVer');
  return `${match[1]}.${match[2]}.${String(Number(match[3]) + 1)}`;
}

const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 10));

export function createSpikeUpdaterHarness(currentVersion: string) {
  const emitter = new EventEmitter();
  let requestedInstall = false;
  const updateInfo: UpdateInfoPort = {
    version: nextPatchVersion(currentVersion),
    releaseDate: '2026-07-11T00:00:00.000Z',
    releaseNotes: 'Packaged updater UI automation fixture',
    files: [{ size: 4096 }],
  };
  const port: UpdaterPort = {
    on: (event, listener) => emitter.on(event, listener),
    off: (event, listener) => emitter.off(event, listener),
    checkForUpdates: async () => {
      await delay();
      emitter.emit('update-available', updateInfo);
      return { isUpdateAvailable: true, updateInfo };
    },
    downloadUpdate: async (cancellationToken) => {
      if (!(cancellationToken instanceof SpikeCancellationPort)) {
        throw new Error('Spike cancellation token 类型无效');
      }
      for (const percent of [25, 100]) {
        await delay();
        if (cancellationToken.cancelled) {
          emitter.emit('update-cancelled', updateInfo);
          throw new Error('cancelled');
        }
        const transferred = Math.round((4096 * percent) / 100);
        emitter.emit('download-progress', {
          percent,
          transferred,
          total: 4096,
          bytesPerSecond: 2048,
        });
      }
      emitter.emit('update-downloaded', updateInfo);
      return [];
    },
    quitAndInstall: () => {
      requestedInstall = true;
    },
  };

  return {
    port,
    createCancellationToken: (): CancellationPort => new SpikeCancellationPort(),
    installRequested: () => requestedInstall,
  };
}

export type { UpdaterEventMap };
