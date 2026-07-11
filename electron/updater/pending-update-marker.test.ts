import { mkdtemp, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { createPendingUpdateMarker } from './pending-update-marker';

const directories: string[] = [];

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

test('writes a minimal atomic marker and clears it after healthy Renderer load', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pending-update-'));
  directories.push(directory);
  const markerPath = path.join(directory, 'updates', 'pending.json');
  const marker = createPendingUpdateMarker(markerPath, () => '2026-07-11T01:00:00.000Z');

  await marker.write({ fromVersion: '0.1.0', toVersion: '0.2.0' });
  expect(await marker.read()).toEqual({
    fromVersion: '0.1.0',
    toVersion: '0.2.0',
    createdAt: '2026-07-11T01:00:00.000Z',
  });
  const raw = await readFile(markerPath, 'utf8');
  expect(raw).not.toMatch(/token|header|path/i);
  if (process.platform !== 'win32') expect((await stat(markerPath)).mode & 0o777).toBe(0o600);

  await marker.clear();
  await expect(marker.read()).resolves.toBeNull();
});

test('rejects corrupt or non-SemVer marker content without leaking it', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pending-update-'));
  directories.push(directory);
  const markerPath = path.join(directory, 'pending.json');
  const marker = createPendingUpdateMarker(markerPath);
  const { mkdir, writeFile } = await import('node:fs/promises');
  await mkdir(directory, { recursive: true });
  await writeFile(markerPath, JSON.stringify({ fromVersion: 'bad', toVersion: '0.2.0', token: 'secret' }));

  await expect(marker.read()).rejects.toThrow('更新 marker 损坏');
});
