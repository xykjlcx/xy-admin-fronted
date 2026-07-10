import type { UpdateCommand, UpdateErrorCode, UpdateSnapshot, UpdateStatus } from '../shared/schemas';
import { UpdateSnapshotSchema } from '../shared/schemas';

export interface UpdateInfoPort {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | Array<{ note?: string | null }> | null;
  files?: Array<{ size?: number | null }>;
}

export interface UpdateProgressPort {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

export interface UpdaterEventMap {
  error: (error: Error) => void;
  'update-available': (info: UpdateInfoPort) => void;
  'update-not-available': (info: UpdateInfoPort) => void;
  'update-downloaded': (info: UpdateInfoPort) => void;
  'download-progress': (progress: UpdateProgressPort) => void;
  'update-cancelled': (info: UpdateInfoPort) => void;
}

export interface CancellationPort {
  cancel(): void;
}

export interface UpdaterPort {
  on<Event extends keyof UpdaterEventMap>(event: Event, listener: UpdaterEventMap[Event]): void;
  off<Event extends keyof UpdaterEventMap>(event: Event, listener: UpdaterEventMap[Event]): void;
  checkForUpdates(): Promise<{ isUpdateAvailable: boolean; updateInfo: UpdateInfoPort } | null>;
  downloadUpdate(cancellationToken: CancellationPort): Promise<string[]>;
  quitAndInstall(): void;
}

interface UpdateControllerDependencies {
  currentVersion: string;
  updater: UpdaterPort;
  createOperationId(): string;
  createCancellationToken(): CancellationPort;
  writePendingMarker(input: { fromVersion: string; toVersion: string }): Promise<void>;
  publish(snapshot: UpdateSnapshot): void;
}

interface Candidate {
  targetVersion: string;
  releaseDate: string | null;
  releaseNotes: string | null;
  packageSize: number | null;
}

const emptyProgress = {
  transferred: 0,
  total: 0,
  percent: 0,
  bytesPerSecond: 0,
} as const;

export class UpdateCommandError extends Error {
  readonly code: 'INVALID_STATE' | 'UNSUPPORTED';
  readonly command: UpdateCommand;
  readonly status: UpdateStatus;

  constructor(code: 'INVALID_STATE' | 'UNSUPPORTED', command: UpdateCommand, status: UpdateStatus) {
    super(`${code}: ${command} is not allowed from ${status}`);
    this.name = 'UpdateCommandError';
    this.code = code;
    this.command = command;
    this.status = status;
  }
}

class InvalidUpdateMetadataError extends Error {
  constructor() {
    super('Update metadata is invalid');
    this.name = 'InvalidUpdateMetadataError';
  }
}

function parseStableVersion(value: string): [number, number, number] | null {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (![major, minor, patch].every(Number.isSafeInteger)) return null;
  return [major, minor, patch];
}

function isHigherStableVersion(candidate: string, current: string): boolean | null {
  const next = parseStableVersion(candidate);
  const active = parseStableVersion(current);
  if (!next || !active) return null;
  for (let index = 0; index < 3; index += 1) {
    const nextPart = next[index];
    const activePart = active[index];
    if (nextPart === undefined || activePart === undefined) return null;
    if (nextPart > activePart) return true;
    if (nextPart < activePart) return false;
  }
  return false;
}

function normalizeReleaseDate(value: string | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new InvalidUpdateMetadataError();
  return new Date(timestamp).toISOString();
}

function normalizeReleaseNotes(value: UpdateInfoPort['releaseNotes']): string | null {
  if (typeof value === 'string') return value.slice(0, 20_000);
  if (!value) return null;
  const notes = value
    .map((entry) => entry.note?.trim())
    .filter((entry): entry is string => Boolean(entry))
    .join('\n\n');
  return notes ? notes.slice(0, 20_000) : null;
}

function normalizePackageSize(files: UpdateInfoPort['files']): number | null {
  if (!files?.length) return null;
  let total = 0;
  for (const file of files) {
    if (file.size === undefined || file.size === null) continue;
    if (!Number.isSafeInteger(file.size) || file.size < 0) throw new InvalidUpdateMetadataError();
    total += file.size;
    if (!Number.isSafeInteger(total)) throw new InvalidUpdateMetadataError();
  }
  return total > 0 ? total : null;
}

function normalizeProgressInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  const integer = Math.trunc(value);
  if (!Number.isSafeInteger(integer)) return fallback;
  return Math.max(0, integer);
}

function normalizeProgressNumber(value: number, fallback: number, maximum?: number): number {
  if (!Number.isFinite(value)) return fallback;
  const nonNegative = Math.max(0, value);
  return maximum === undefined ? nonNegative : Math.min(maximum, nonNegative);
}

function candidateFromInfo(info: UpdateInfoPort, currentVersion: string): Candidate | null {
  const higher = isHigherStableVersion(info.version, currentVersion);
  if (higher === null) throw new InvalidUpdateMetadataError();
  if (!higher) return null;
  return {
    targetVersion: info.version,
    releaseDate: normalizeReleaseDate(info.releaseDate),
    releaseNotes: normalizeReleaseNotes(info.releaseNotes),
    packageSize: normalizePackageSize(info.files),
  };
}

export function createUpdateController(dependencies: UpdateControllerDependencies) {
  if (!parseStableVersion(dependencies.currentVersion)) throw new InvalidUpdateMetadataError();
  let snapshot: UpdateSnapshot = UpdateSnapshotSchema.parse({
    status: 'idle',
    currentVersion: dependencies.currentVersion,
    operationId: null,
    lastCommand: null,
    retryable: false,
    targetVersion: null,
    releaseDate: null,
    releaseNotes: null,
    packageSize: null,
    ...emptyProgress,
    errorCode: null,
  });
  let candidate: Candidate | null = null;
  let checkPromise: Promise<UpdateSnapshot> | null = null;
  let downloadPromise: Promise<UpdateSnapshot> | null = null;
  let cancelPromise: Promise<UpdateSnapshot> | null = null;
  let installPromise: Promise<UpdateSnapshot> | null = null;
  let cancellationToken: CancellationPort | null = null;
  let cancellationRequested = false;

  const publish = (next: UpdateSnapshot): UpdateSnapshot => {
    snapshot = UpdateSnapshotSchema.parse(next);
    dependencies.publish(snapshot);
    return snapshot;
  };

  const withCandidate = (status: UpdateStatus, command: UpdateCommand): UpdateSnapshot => {
    if (!candidate) throw new InvalidUpdateMetadataError();
    const total = candidate.packageSize ?? 0;
    return publish({
      ...snapshot,
      ...candidate,
      status,
      operationId: dependencies.createOperationId(),
      lastCommand: command,
      retryable: false,
      ...emptyProgress,
      total,
      errorCode: null,
    });
  };

  const publishAvailable = (nextCandidate: Candidate, command: UpdateCommand = 'check') => {
    candidate = nextCandidate;
    return withCandidate('available', command);
  };

  const publishUpToDate = () => {
    candidate = null;
    return publish({
      ...snapshot,
      status: 'upToDate',
      lastCommand: 'check',
      retryable: false,
      targetVersion: null,
      releaseDate: null,
      releaseNotes: null,
      packageSize: null,
      ...emptyProgress,
      errorCode: null,
    });
  };

  const publishError = (errorCode: UpdateErrorCode, retryable: boolean) =>
    publish({ ...snapshot, status: 'error', retryable, errorCode, bytesPerSecond: 0 });

  const applyAvailableInfo = (info: UpdateInfoPort): UpdateSnapshot => {
    try {
      const nextCandidate = candidateFromInfo(info, dependencies.currentVersion);
      return nextCandidate ? publishAvailable(nextCandidate) : publishUpToDate();
    } catch {
      return publishError('INVALID_UPDATE_METADATA', false);
    }
  };

  const listeners: { [Event in keyof UpdaterEventMap]: UpdaterEventMap[Event] } = {
    error: () => {
      if (snapshot.status === 'installing') publishError('UPDATE_INSTALL_FAILED', false);
      else if (snapshot.lastCommand === 'download') publishError('UPDATE_DOWNLOAD_FAILED', true);
      else publishError('UPDATE_CHECK_FAILED', true);
    },
    'update-available': (info) => {
      if (snapshot.status === 'checking') applyAvailableInfo(info);
    },
    'update-not-available': () => {
      if (snapshot.status === 'checking') publishUpToDate();
    },
    'update-downloaded': (info) => {
      if (snapshot.status !== 'downloading') return;
      let nextCandidate: Candidate | null;
      try {
        nextCandidate = candidateFromInfo(info, dependencies.currentVersion);
      } catch {
        publishError('INVALID_UPDATE_METADATA', false);
        return;
      }
      if (!nextCandidate) {
        publishError('INVALID_UPDATE_METADATA', false);
        return;
      }
      candidate = nextCandidate;
      const total = snapshot.total || nextCandidate.packageSize || snapshot.transferred;
      publish({
        ...snapshot,
        ...nextCandidate,
        status: 'downloaded',
        retryable: false,
        transferred: total,
        total,
        percent: 100,
        bytesPerSecond: 0,
        errorCode: null,
      });
    },
    'download-progress': (progress) => {
      if (snapshot.status !== 'downloading' || cancellationRequested) return;
      const total = normalizeProgressInteger(progress.total, snapshot.total);
      const received = normalizeProgressInteger(progress.transferred, snapshot.transferred);
      const transferred = total > 0 ? Math.min(total, received) : 0;
      publish({
        ...snapshot,
        transferred,
        total,
        percent: normalizeProgressNumber(progress.percent, snapshot.percent, 100),
        bytesPerSecond: normalizeProgressNumber(progress.bytesPerSecond, 0),
      });
    },
    'update-cancelled': () => {
      if (snapshot.status !== 'downloading') return;
      publish({
        ...snapshot,
        status: 'cancelled',
        retryable: true,
        bytesPerSecond: 0,
        errorCode: null,
      });
    },
  };

  for (const [event, listener] of Object.entries(listeners) as Array<
    [keyof UpdaterEventMap, UpdaterEventMap[keyof UpdaterEventMap]]
  >) {
    dependencies.updater.on(event, listener);
  }

  const stateError = (command: UpdateCommand, allowed: UpdateStatus[]) =>
    allowed.includes(snapshot.status)
      ? null
      : new UpdateCommandError('INVALID_STATE', command, snapshot.status);

  const check = (): Promise<UpdateSnapshot> => {
    if (snapshot.status === 'checking' && checkPromise) return checkPromise;
    const invalid = stateError('check', ['idle', 'upToDate', 'available', 'error', 'cancelled']);
    if (invalid) return Promise.reject(invalid);
    publish({
      ...snapshot,
      status: 'checking',
      operationId: dependencies.createOperationId(),
      lastCommand: 'check',
      retryable: false,
      targetVersion: null,
      releaseDate: null,
      releaseNotes: null,
      packageSize: null,
      ...emptyProgress,
      errorCode: null,
    });
    const task = (async () => {
      try {
        const result = await dependencies.updater.checkForUpdates();
        if (snapshot.status !== 'checking') return snapshot;
        if (!result) return publishError('UPDATE_CHECK_FAILED', true);
        if (!result.isUpdateAvailable) return publishUpToDate();
        return applyAvailableInfo(result.updateInfo);
      } catch {
        if (snapshot.status === 'error') return snapshot;
        return publishError('UPDATE_CHECK_FAILED', true);
      }
    })();
    checkPromise = task;
    void task.finally(() => {
      if (checkPromise === task) checkPromise = null;
    });
    return task;
  };

  const download = (): Promise<UpdateSnapshot> => {
    const invalid = stateError('download', ['available']);
    if (invalid) return Promise.reject(invalid);
    withCandidate('downloading', 'download');
    cancellationToken = dependencies.createCancellationToken();
    cancellationRequested = false;
    cancelPromise = null;
    const activeToken = cancellationToken;
    const task = (async () => {
      try {
        await dependencies.updater.downloadUpdate(activeToken);
        if (snapshot.status === 'downloading') {
          const total = snapshot.total || candidate?.packageSize || snapshot.transferred;
          publish({
            ...snapshot,
            status: 'downloaded',
            retryable: false,
            transferred: total,
            total,
            percent: 100,
            bytesPerSecond: 0,
            errorCode: null,
          });
        }
        return snapshot;
      } catch {
        if (cancellationRequested || snapshot.status === 'cancelled') {
          if (snapshot.status !== 'cancelled') {
            publish({
              ...snapshot,
              status: 'cancelled',
              retryable: true,
              bytesPerSecond: 0,
              errorCode: null,
            });
          }
          return snapshot;
        }
        if (snapshot.status === 'error') return snapshot;
        return publishError('UPDATE_DOWNLOAD_FAILED', true);
      } finally {
        cancellationToken = null;
        cancellationRequested = false;
      }
    })();
    downloadPromise = task;
    void task.finally(() => {
      if (downloadPromise === task) downloadPromise = null;
      if (cancelPromise === task) cancelPromise = null;
    });
    return task;
  };

  const cancelDownload = (): Promise<UpdateSnapshot> => {
    if (snapshot.status === 'downloading' && cancelPromise) return cancelPromise;
    const invalid = stateError('cancelDownload', ['downloading']);
    if (invalid) return Promise.reject(invalid);
    if (!downloadPromise || !cancellationToken) {
      return Promise.reject(new UpdateCommandError('INVALID_STATE', 'cancelDownload', snapshot.status));
    }
    cancellationRequested = true;
    cancellationToken.cancel();
    cancelPromise = downloadPromise;
    return cancelPromise;
  };

  const retry = (): Promise<UpdateSnapshot> => {
    const invalid = stateError('retry', ['error', 'cancelled']);
    if (invalid) return Promise.reject(invalid);
    if (!snapshot.retryable) {
      return Promise.reject(new UpdateCommandError('INVALID_STATE', 'retry', snapshot.status));
    }
    if (snapshot.lastCommand === 'check') return check();
    if (snapshot.lastCommand === 'download' && candidate) {
      publishAvailable(candidate, 'download');
      return download();
    }
    return Promise.reject(new UpdateCommandError('INVALID_STATE', 'retry', snapshot.status));
  };

  const install = (): Promise<UpdateSnapshot> => {
    if (installPromise) return installPromise;
    const invalid = stateError('install', ['downloaded']);
    if (invalid) return Promise.reject(invalid);
    const targetVersion = snapshot.targetVersion;
    if (!targetVersion) {
      return Promise.reject(new UpdateCommandError('INVALID_STATE', 'install', snapshot.status));
    }
    const task = (async () => {
      try {
        await dependencies.writePendingMarker({
          fromVersion: dependencies.currentVersion,
          toVersion: targetVersion,
        });
        publish({
          ...snapshot,
          status: 'installing',
          operationId: dependencies.createOperationId(),
          lastCommand: 'install',
          retryable: false,
          bytesPerSecond: 0,
          errorCode: null,
        });
        dependencies.updater.quitAndInstall();
        return snapshot;
      } catch {
        return publishError('UPDATE_INSTALL_FAILED', false);
      }
    })();
    installPromise = task;
    void task.finally(() => {
      if (snapshot.status !== 'installing' && installPromise === task) installPromise = null;
    });
    return task;
  };

  return {
    getSnapshot: () => snapshot,
    check,
    download,
    cancelDownload,
    retry,
    install,
    execute(command: UpdateCommand): Promise<UpdateSnapshot> {
      if (command === 'check') return check();
      if (command === 'download') return download();
      if (command === 'cancelDownload') return cancelDownload();
      if (command === 'retry') return retry();
      return install();
    },
    dispose(): void {
      if (snapshot.status === 'downloading') cancellationToken?.cancel();
      for (const [event, listener] of Object.entries(listeners) as Array<
        [keyof UpdaterEventMap, UpdaterEventMap[keyof UpdaterEventMap]]
      >) {
        dependencies.updater.off(event, listener);
      }
    },
  };
}
