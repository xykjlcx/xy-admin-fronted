import electronUpdater from 'electron-updater';
import type { CancellationToken as ElectronCancellationToken } from 'electron-updater';
import type { CancellationPort, UpdaterEventMap, UpdaterPort } from './update-controller';

const { CancellationToken } = electronUpdater;

export interface ElectronUpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  allowDowngrade: boolean;
  requestHeaders: Record<string, string | string[] | number | undefined> | null;
  setFeedURL(options: { provider: 'generic'; url: string }): void;
  on(event: string, listener: (...args: never[]) => void): unknown;
  off(event: string, listener: (...args: never[]) => void): unknown;
  checkForUpdates(): Promise<{
    isUpdateAvailable: boolean;
    updateInfo: {
      version: string;
      releaseDate?: string;
      releaseNotes?: string | Array<{ note?: string | null }> | null;
      files?: Array<{ size?: number | null }>;
    };
  } | null>;
  downloadUpdate(token: ElectronCancellationToken): Promise<string[]>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
}

class ElectronCancellationPort implements CancellationPort {
  readonly token = new CancellationToken();

  cancel(): void {
    this.token.cancel();
  }
}

export function createElectronCancellationPort(): CancellationPort {
  return new ElectronCancellationPort();
}

export function configureElectronUpdater(updater: ElectronUpdaterLike, feedUrl: string): UpdaterPort {
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.allowDowngrade = false;
  updater.requestHeaders = null;
  updater.setFeedURL({ provider: 'generic', url: feedUrl });

  return {
    on: (event, listener) => updater.on(event, listener as (...args: never[]) => void),
    off: (event, listener) => updater.off(event, listener as (...args: never[]) => void),
    checkForUpdates: () => updater.checkForUpdates(),
    downloadUpdate: (cancellationToken) => {
      if (!(cancellationToken instanceof ElectronCancellationPort)) {
        throw new Error('Electron updater cancellation token 类型无效');
      }
      return updater.downloadUpdate(cancellationToken.token);
    },
    quitAndInstall: () => updater.quitAndInstall(false, true),
  } satisfies UpdaterPort;
}

export type { UpdaterEventMap };
