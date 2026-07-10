import path from 'node:path';

export function parseSpikeUserDataPath(value: string | undefined, spikeMode: boolean): string | null {
  if (!value) return null;
  if (!spikeMode) throw new Error('SPIKE_USER_DATA_PATH 只能在 DESKTOP_SPIKE_MODE=true 时使用');
  if (!path.isAbsolute(value)) throw new Error('SPIKE_USER_DATA_PATH 必须是绝对路径');
  return path.resolve(value);
}

export function parseSpikeDownloadPath(
  value: string | undefined,
  spikeMode: boolean,
  userDataPath: string,
): string | null {
  if (!value) return null;
  if (!spikeMode) throw new Error('SPIKE_DOWNLOAD_PATH 只能在 DESKTOP_SPIKE_MODE=true 时使用');
  if (!path.isAbsolute(value)) throw new Error('SPIKE_DOWNLOAD_PATH 必须是绝对路径');
  const resolvedUserData = path.resolve(userDataPath);
  const resolvedDownload = path.resolve(value);
  const relative = path.relative(resolvedUserData, resolvedDownload);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('SPIKE_DOWNLOAD_PATH 必须位于隔离的 userData 目录内');
  }
  return resolvedDownload;
}
