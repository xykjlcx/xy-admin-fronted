import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { extractFile, listPackage } from '@electron/asar';
import { load } from 'js-yaml';
import { desktopDefaults } from '../desktop.config.ts';
import { verifyReleaseFuseWire } from './release-fuses.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const maxArchiveBytes = 8 * 1024 * 1024;

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeArtifactName(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value !== path.basename(value) ||
    value.includes('\\') ||
    value.includes('/') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    throw new Error(`更新 metadata 文件名无效: ${String(value)}`);
  }
  return value;
}

function sha512File(file) {
  return createHash('sha512').update(readFileSync(file)).digest('base64');
}

function metadataFilename(platform) {
  return platform === 'darwin' ? 'latest-mac.yml' : 'latest.yml';
}

function assertArtifactArchitecture(filename, platform, arch) {
  if (platform === 'darwin' && !filename.includes(`-${arch}.`)) {
    throw new Error(`macOS 更新产物必须与 ${arch} feed 一致: ${filename}`);
  }
  if (platform === 'win32' && (arch !== 'x64' || !filename.toLowerCase().endsWith('.exe'))) {
    throw new Error(`Windows 更新产物必须是 x64 NSIS EXE: ${filename}`);
  }
}

function parseMetadata(metadataPath) {
  const parsed = load(readFileSync(metadataPath, 'utf8'));
  if (!isRecord(parsed)) throw new Error('更新 metadata 必须是 YAML object');
  return parsed;
}

export function verifyPackagedArchive(asarPath, expectedVersion) {
  const archiveSize = statSync(asarPath).size;
  if (archiveSize > maxArchiveBytes) {
    throw new Error(`app.asar ${String(archiveSize)} bytes 超出 ${String(maxArchiveBytes)} bytes 上限`);
  }
  const files = listPackage(asarPath).map((entry) => entry.replaceAll('\\', '/'));
  const forbidden = files.find((entry) => {
    const basename = path.posix.basename(entry);
    return (
      entry === '/node_modules' ||
      entry.startsWith('/node_modules/') ||
      entry.includes('/.superpowers/') ||
      entry.includes('/test-results/') ||
      entry.includes('/__snapshots__/') ||
      basename.startsWith('.env') ||
      /\.(?:pem|p12|pfx|cer|crt|key)$/i.test(basename) ||
      /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(basename)
    );
  });
  if (forbidden) throw new Error(`app.asar 包含禁止文件: ${forbidden}`);
  for (const required of [
    '/out/main/index.js',
    '/out/preload/index.cjs',
    '/out/renderer/index.html',
    '/out/renderer/electron/renderer/recovery.html',
    '/package.json',
  ]) {
    if (!files.includes(required)) throw new Error(`app.asar 缺少 ${required}`);
  }
  const metadata = JSON.parse(extractFile(asarPath, 'package.json').toString('utf8'));
  if (!isRecord(metadata) || metadata.version !== expectedVersion || metadata.main !== 'out/main/index.js') {
    throw new Error('app.asar package.json 版本或 Main 入口不一致');
  }
  return { fileCount: files.length, archiveSize, version: metadata.version };
}

export function verifyUpdateMetadata({ metadataPath, releaseRoot, platform, arch, expectedVersion }) {
  const expectedMetadataName = metadataFilename(platform);
  if (path.basename(metadataPath) !== expectedMetadataName) {
    throw new Error(`metadata 必须命名为 ${expectedMetadataName}`);
  }
  const metadata = parseMetadata(metadataPath);
  if (metadata.version !== expectedVersion) {
    throw new Error(`metadata version ${String(metadata.version)} 与 ${expectedVersion} 不一致`);
  }
  if (typeof metadata.releaseDate !== 'string' || !Number.isFinite(Date.parse(metadata.releaseDate))) {
    throw new Error('metadata releaseDate 无效');
  }
  if (!Array.isArray(metadata.files) || metadata.files.length === 0) {
    throw new Error('metadata files 不能为空');
  }

  const artifacts = metadata.files.map((entry) => {
    if (!isRecord(entry)) throw new Error('metadata files 条目无效');
    const filename = safeArtifactName(entry.url);
    assertArtifactArchitecture(filename, platform, arch);
    const artifactPath = path.join(releaseRoot, filename);
    if (!existsSync(artifactPath) || !statSync(artifactPath).isFile()) {
      throw new Error(`metadata 引用产物不存在: ${filename}`);
    }
    const size = statSync(artifactPath).size;
    if (!Number.isSafeInteger(entry.size) || entry.size !== size) {
      throw new Error(`metadata size 与产物不一致: ${filename}`);
    }
    const actualHash = sha512File(artifactPath);
    if (typeof entry.sha512 !== 'string' || entry.sha512 !== actualHash) {
      throw new Error(`metadata sha512 与产物不一致: ${filename}`);
    }
    return { filename, path: artifactPath, size, sha512: actualHash };
  });

  const updateArtifact = safeArtifactName(metadata.path);
  const updateEntry = artifacts.find((artifact) => artifact.filename === updateArtifact);
  if (!updateEntry || metadata.sha512 !== updateEntry.sha512) {
    throw new Error('metadata path/sha512 未指向已校验的更新产物');
  }
  if (platform === 'darwin' && !updateArtifact.endsWith('.zip')) {
    throw new Error('macOS metadata path 必须指向 ZIP 更新产物');
  }
  return { metadata, artifacts, updateArtifact, artifactCount: artifacts.length };
}

export function stageAndVerifyUpdateFeed({ releaseRoot, feedRoot, platform, arch, expectedVersion }) {
  const sourceMetadata = path.join(releaseRoot, metadataFilename(platform));
  const verified = verifyUpdateMetadata({
    metadataPath: sourceMetadata,
    releaseRoot,
    platform,
    arch,
    expectedVersion,
  });
  const feedDirectory = path.join(feedRoot, 'stable', platform, arch);
  mkdirSync(feedDirectory, { recursive: true });
  const stagedFiles = [];
  // 二进制与 blockmap 先可见，metadata 始终最后写入。
  for (const artifact of verified.artifacts) {
    copyFileSync(artifact.path, path.join(feedDirectory, artifact.filename));
    stagedFiles.push(artifact.filename);
    const blockmap = `${artifact.path}.blockmap`;
    if (existsSync(blockmap)) {
      const blockmapName = `${artifact.filename}.blockmap`;
      copyFileSync(blockmap, path.join(feedDirectory, blockmapName));
      stagedFiles.push(blockmapName);
    }
  }
  const stagedMetadata = path.join(feedDirectory, metadataFilename(platform));
  copyFileSync(sourceMetadata, stagedMetadata);
  stagedFiles.push(metadataFilename(platform));
  verifyUpdateMetadata({
    metadataPath: stagedMetadata,
    releaseRoot: feedDirectory,
    platform,
    arch,
    expectedVersion,
  });
  return { feedDirectory, files: stagedFiles };
}

function readPackageVersion() {
  const parsed = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  if (!isRecord(parsed) || typeof parsed.version !== 'string') throw new Error('package version 无效');
  return parsed.version;
}

function verifyMacBundleSecurityMetadata(appPath) {
  const plistPath = path.join(appPath, 'Contents', 'Info.plist');
  const integrity = JSON.parse(
    execFileSync('plutil', ['-extract', 'ElectronAsarIntegrity', 'json', '-o', '-', plistPath], {
      encoding: 'utf8',
    }),
  );
  const appAsar = integrity['Resources/app.asar'];
  if (
    !isRecord(appAsar) ||
    appAsar.algorithm !== 'SHA256' ||
    typeof appAsar.hash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(appAsar.hash)
  ) {
    throw new Error('macOS bundle 缺少有效 ElectronAsarIntegrity');
  }
  const signatureResult = spawnSync('codesign', ['-dv', '--verbose=2', appPath], { encoding: 'utf8' });
  if (signatureResult.status !== 0) throw new Error('macOS bundle 签名回读失败');
  const signatureOutput = `${signatureResult.stdout}\n${signatureResult.stderr}`;
  const adHoc = signatureOutput.includes('Signature=adhoc');
  const rawTeamId = /TeamIdentifier=([^\n]+)/.exec(signatureOutput)?.[1]?.trim() ?? null;
  const teamId = rawTeamId === 'not set' ? null : rawTeamId;
  if (process.env.DESKTOP_RELEASE_BUILD === 'true') {
    if (adHoc || !teamId || teamId !== desktopDefaults.macTeamId) {
      throw new Error('macOS 正式产物签名 Team ID 回读失败');
    }
  }
  return { asarIntegrity: true, signature: adHoc ? 'adhoc' : 'developer-id', teamId };
}

export function assertWindowsSignatureEvidence(evidence, options) {
  const valid = evidence.status === 'Valid' && typeof evidence.subject === 'string';
  if (options.releaseBuild) {
    if (
      !valid ||
      !options.expectedPublisher ||
      !evidence.subject.toLowerCase().includes(options.expectedPublisher.toLowerCase())
    ) {
      throw new Error('Windows Authenticode publisher 回读失败');
    }
  }
  return {
    signature: valid ? 'authenticode' : 'unsigned',
    publisher: valid ? evidence.subject : null,
  };
}

function verifyWindowsBundleSecurityMetadata(executablePath) {
  const command = [
    '$signature = Get-AuthenticodeSignature -LiteralPath $env:DESKTOP_VERIFY_EXE',
    '[pscustomobject]@{ status = $signature.Status.ToString(); subject = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null } } | ConvertTo-Json -Compress',
  ].join('; ');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
    encoding: 'utf8',
    env: { ...process.env, DESKTOP_VERIFY_EXE: executablePath },
  });
  if (result.status !== 0) throw new Error('Windows Authenticode 回读命令失败');
  const parsed = JSON.parse(result.stdout);
  if (!isRecord(parsed) || typeof parsed.status !== 'string') {
    throw new Error('Windows Authenticode 回读证据无效');
  }
  return assertWindowsSignatureEvidence(
    {
      status: parsed.status,
      subject: typeof parsed.subject === 'string' ? parsed.subject : null,
    },
    {
      releaseBuild: process.env.DESKTOP_RELEASE_BUILD === 'true',
      expectedPublisher: desktopDefaults.windowsPublisher,
    },
  );
}

function parseCli(argv) {
  const options = Object.fromEntries(
    argv.map((value) => {
      const match = /^--([a-z-]+)=(.+)$/.exec(value);
      if (!match) throw new Error(`无效参数: ${value}`);
      return [match[1], match[2]];
    }),
  );
  const platform = options.platform;
  const arch = options.arch;
  if ((platform !== 'darwin' && platform !== 'win32') || (arch !== 'arm64' && arch !== 'x64')) {
    throw new Error('platform/arch 必须是 darwin arm64|x64 或 win32 x64');
  }
  if (platform === 'win32' && arch !== 'x64') throw new Error('Windows 首期只支持 x64');
  const releaseRoot = path.resolve(projectRoot, options['release-dir'] ?? 'release');
  const feedRoot = path.resolve(projectRoot, options['feed-root'] ?? 'release/feed');
  return { platform, arch, releaseRoot, feedRoot };
}

async function runCli(argv) {
  const { platform, arch, releaseRoot, feedRoot } = parseCli(argv);
  const version = readPackageVersion();
  const unpackedDirectory =
    platform === 'darwin'
      ? path.join(releaseRoot, arch === 'arm64' ? 'mac-arm64' : 'mac')
      : path.join(releaseRoot, 'win-unpacked');
  const appPath =
    platform === 'darwin'
      ? path.join(unpackedDirectory, `${desktopDefaults.executableName}.app`)
      : path.join(unpackedDirectory, `${desktopDefaults.executableName}.exe`);
  const resources =
    platform === 'darwin'
      ? path.join(appPath, 'Contents', 'Resources')
      : path.join(unpackedDirectory, 'resources');
  const archive = verifyPackagedArchive(path.join(resources, 'app.asar'), version);
  await verifyReleaseFuseWire(appPath);
  const platformSecurity =
    platform === 'darwin'
      ? verifyMacBundleSecurityMetadata(appPath)
      : verifyWindowsBundleSecurityMetadata(appPath);
  const feed = stageAndVerifyUpdateFeed({ releaseRoot, feedRoot, platform, arch, expectedVersion: version });
  process.stdout.write(`${JSON.stringify({ platform, arch, archive, platformSecurity, feed })}\n`);
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) await runCli(process.argv.slice(2));
