import path from 'node:path';

export function parseSpikeUserDataPath(value: string | undefined, spikeMode: boolean): string | null {
  if (!value) return null;
  if (!spikeMode) throw new Error('SPIKE_USER_DATA_PATH 只能在 DESKTOP_SPIKE_MODE=true 时使用');
  if (!path.isAbsolute(value)) throw new Error('SPIKE_USER_DATA_PATH 必须是绝对路径');
  return path.resolve(value);
}
