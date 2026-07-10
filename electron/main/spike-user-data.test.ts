import { expect, test } from 'vitest';
import { parseSpikeUserDataPath } from './spike-user-data';

test('allows an isolated userData path only in explicit Spike mode', () => {
  expect(parseSpikeUserDataPath('/tmp/electron-spike-user-data', true)).toBe('/tmp/electron-spike-user-data');
  expect(() => parseSpikeUserDataPath('/tmp/electron-spike-user-data', false)).toThrow(
    'SPIKE_USER_DATA_PATH',
  );
  expect(() => parseSpikeUserDataPath('relative/user-data', true)).toThrow('绝对路径');
});
