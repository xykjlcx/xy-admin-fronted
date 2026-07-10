import { expect, test } from 'vitest';
import { parseSpikeDownloadPath, parseSpikeUserDataPath } from './spike-user-data';

test('allows an isolated userData path only in explicit Spike mode', () => {
  expect(parseSpikeUserDataPath('/tmp/electron-spike-user-data', true)).toBe('/tmp/electron-spike-user-data');
  expect(() => parseSpikeUserDataPath('/tmp/electron-spike-user-data', false)).toThrow(
    'SPIKE_USER_DATA_PATH',
  );
  expect(() => parseSpikeUserDataPath('relative/user-data', true)).toThrow('绝对路径');
});

test('allows a deterministic save-dialog stub only inside isolated Spike userData', () => {
  expect(parseSpikeDownloadPath('/tmp/electron-spike/download.bin', true, '/tmp/electron-spike')).toBe(
    '/tmp/electron-spike/download.bin',
  );
  expect(() =>
    parseSpikeDownloadPath('/tmp/electron-spike/download.bin', false, '/tmp/electron-spike'),
  ).toThrow('SPIKE_DOWNLOAD_PATH');
  expect(() => parseSpikeDownloadPath('download.bin', true, '/tmp/electron-spike')).toThrow('绝对路径');
  expect(() => parseSpikeDownloadPath('/tmp/outside.bin', true, '/tmp/electron-spike')).toThrow('userData');
});
