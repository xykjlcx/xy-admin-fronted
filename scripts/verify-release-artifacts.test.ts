import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createPackage } from '@electron/asar';
import { dump } from 'js-yaml';
import { afterEach, describe, expect, test } from 'vitest';
import {
  assertWindowsSignatureEvidence,
  stageAndVerifyUpdateFeed,
  verifyPackagedArchive,
  verifyUpdateMetadata,
} from './verify-release-artifacts.mjs';

const roots: string[] = [];

function root(): string {
  const value = mkdtempSync(path.join(os.tmpdir(), 'release-artifact-'));
  roots.push(value);
  return value;
}

function sha512(value: Buffer): string {
  return createHash('sha512').update(value).digest('base64');
}

function write(rootPath: string, relative: string, content: string | Buffer): string {
  const target = path.join(rootPath, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

afterEach(() => {
  for (const value of roots.splice(0)) rmSync(value, { recursive: true, force: true });
});

describe('release artifact verifier', () => {
  test('requires a valid Authenticode publisher match for Windows release evidence', () => {
    expect(
      assertWindowsSignatureEvidence(
        { status: 'NotSigned', subject: null },
        { releaseBuild: false, expectedPublisher: null },
      ),
    ).toEqual({ signature: 'unsigned', publisher: null });
    expect(() =>
      assertWindowsSignatureEvidence(
        { status: 'NotSigned', subject: null },
        { releaseBuild: true, expectedPublisher: 'Example Inc.' },
      ),
    ).toThrow('Authenticode');
    expect(
      assertWindowsSignatureEvidence(
        { status: 'Valid', subject: 'CN=Example Inc., O=Example Inc.' },
        { releaseBuild: true, expectedPublisher: 'Example Inc.' },
      ),
    ).toEqual({ signature: 'authenticode', publisher: 'CN=Example Inc., O=Example Inc.' });
  });

  test('accepts only the compiled app archive and rejects duplicated dependencies or secrets', async () => {
    const source = root();
    write(source, 'out/main/index.js', 'main');
    write(source, 'out/preload/index.cjs', 'preload');
    write(source, 'out/renderer/index.html', '<main></main>');
    write(source, 'out/renderer/electron/renderer/recovery.html', '<main>recovery</main>');
    write(source, 'package.json', JSON.stringify({ version: '0.1.0', main: 'out/main/index.js' }));
    const cleanAsar = path.join(root(), 'app.asar');
    await createPackage(source, cleanAsar);
    expect(verifyPackagedArchive(cleanAsar, '0.1.0')).toMatchObject({ version: '0.1.0' });

    rmSync(path.join(source, 'out/renderer/electron'), { recursive: true });
    const missingRecoveryAsar = path.join(root(), 'app.asar');
    await createPackage(source, missingRecoveryAsar);
    expect(() => verifyPackagedArchive(missingRecoveryAsar, '0.1.0')).toThrow('recovery.html');
    write(source, 'out/renderer/electron/renderer/recovery.html', '<main>recovery</main>');

    write(source, 'node_modules/react/index.js', 'duplicated renderer dependency');
    const duplicatedAsar = path.join(root(), 'app.asar');
    await createPackage(source, duplicatedAsar);
    expect(() => verifyPackagedArchive(duplicatedAsar, '0.1.0')).toThrow('node_modules');

    rmSync(path.join(source, 'node_modules'), { recursive: true });
    write(source, '.env.production', 'TOKEN=secret');
    const secretAsar = path.join(root(), 'app.asar');
    await createPackage(source, secretAsar);
    expect(() => verifyPackagedArchive(secretAsar, '0.1.0')).toThrow('禁止文件');
  });

  test('verifies metadata path, arch, byte length and sha512 then stages the feed', () => {
    const releaseRoot = root();
    const zip = Buffer.from('signed macOS zip fixture');
    const dmg = Buffer.from('first install fixture');
    write(releaseRoot, 'admin-scaffold-frontend-0.1.0-arm64.zip', zip);
    write(releaseRoot, 'admin-scaffold-frontend-0.1.0-arm64.zip.blockmap', 'zip blockmap');
    write(releaseRoot, 'admin-scaffold-frontend-0.1.0-arm64.dmg', dmg);
    write(releaseRoot, 'admin-scaffold-frontend-0.1.0-arm64.dmg.blockmap', 'dmg blockmap');
    const metadata = {
      version: '0.1.0',
      files: [
        {
          url: 'admin-scaffold-frontend-0.1.0-arm64.zip',
          sha512: sha512(zip),
          size: zip.length,
        },
        {
          url: 'admin-scaffold-frontend-0.1.0-arm64.dmg',
          sha512: sha512(dmg),
          size: dmg.length,
        },
      ],
      path: 'admin-scaffold-frontend-0.1.0-arm64.zip',
      sha512: sha512(zip),
      releaseDate: '2026-07-11T00:00:00.000Z',
    };
    const metadataPath = write(releaseRoot, 'latest-mac.yml', dump(metadata));
    expect(
      verifyUpdateMetadata({
        metadataPath,
        releaseRoot,
        platform: 'darwin',
        arch: 'arm64',
        expectedVersion: '0.1.0',
      }),
    ).toMatchObject({ updateArtifact: metadata.path, artifactCount: 2 });

    const feedRoot = path.join(root(), 'feed');
    const staged = stageAndVerifyUpdateFeed({
      releaseRoot,
      feedRoot,
      platform: 'darwin',
      arch: 'arm64',
      expectedVersion: '0.1.0',
    });
    expect(staged.feedDirectory).toBe(path.join(feedRoot, 'stable/darwin/arm64'));
    expect(readFileSync(path.join(staged.feedDirectory, 'latest-mac.yml'), 'utf8')).toContain(
      'version: 0.1.0',
    );
    expect(staged.files).toEqual(
      expect.arrayContaining([
        metadata.path,
        `${metadata.path}.blockmap`,
        'admin-scaffold-frontend-0.1.0-arm64.dmg',
      ]),
    );
  });

  test('rejects traversal, wrong architecture and a metadata hash mismatch', () => {
    const releaseRoot = root();
    const artifact = Buffer.from('artifact');
    write(releaseRoot, 'app-0.1.0-x64.zip', artifact);
    const metadataPath = write(
      releaseRoot,
      'latest-mac.yml',
      dump({
        version: '0.1.0',
        files: [{ url: 'app-0.1.0-x64.zip', sha512: sha512(artifact), size: artifact.length }],
        path: 'app-0.1.0-x64.zip',
        sha512: sha512(artifact),
        releaseDate: '2026-07-11T00:00:00.000Z',
      }),
    );
    expect(() =>
      verifyUpdateMetadata({
        metadataPath,
        releaseRoot,
        platform: 'darwin',
        arch: 'arm64',
        expectedVersion: '0.1.0',
      }),
    ).toThrow('arm64');

    writeFileSync(
      metadataPath,
      dump({
        version: '0.1.0',
        files: [{ url: '../app.zip', sha512: sha512(artifact), size: artifact.length }],
        path: '../app.zip',
        sha512: sha512(artifact),
        releaseDate: '2026-07-11T00:00:00.000Z',
      }),
    );
    expect(() =>
      verifyUpdateMetadata({
        metadataPath,
        releaseRoot,
        platform: 'darwin',
        arch: 'arm64',
        expectedVersion: '0.1.0',
      }),
    ).toThrow('文件名');

    writeFileSync(
      metadataPath,
      dump({
        version: '0.1.0',
        files: [{ url: 'app-0.1.0-arm64.zip', sha512: 'invalid', size: artifact.length }],
        path: 'app-0.1.0-arm64.zip',
        sha512: 'invalid',
        releaseDate: '2026-07-11T00:00:00.000Z',
      }),
    );
    write(releaseRoot, 'app-0.1.0-arm64.zip', artifact);
    expect(() =>
      verifyUpdateMetadata({
        metadataPath,
        releaseRoot,
        platform: 'darwin',
        arch: 'arm64',
        expectedVersion: '0.1.0',
      }),
    ).toThrow('sha512');
  });
});
