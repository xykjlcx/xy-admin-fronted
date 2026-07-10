import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Configuration } from 'electron-builder';
import {
  desktopDefaults,
  parseDesktopPackagingConfig,
  requireReleaseIdentity,
  type DesktopPackagingConfig,
} from './desktop.config';

type BuildEnvironment = Record<string, string | undefined>;

const packageVersion = (() => {
  const parsed = JSON.parse(readFileSync(path.join(import.meta.dirname, 'package.json'), 'utf8')) as {
    version?: unknown;
  };
  if (
    typeof parsed.version !== 'string' ||
    !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/.test(parsed.version)
  ) {
    throw new Error('package.json.version 必须是稳定 SemVer');
  }
  return parsed.version;
})();

function parseBoolean(environment: BuildEnvironment, key: string): boolean {
  const value = environment[key];
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error(`${key} 必须是 true 或 false`);
}

function requireSecret(environment: BuildEnvironment, key: string): string {
  const value = environment[key]?.trim();
  if (!value) throw new Error(`正式发布缺少 ${key}`);
  return value;
}

function requireUpdateBaseUrl(environment: BuildEnvironment): string {
  let url: URL;
  try {
    url = new URL(environment.DESKTOP_UPDATE_BASE_URL ?? '');
  } catch {
    throw new Error('DESKTOP_UPDATE_BASE_URL 必须是绝对 HTTPS URL');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('DESKTOP_UPDATE_BASE_URL 必须是无凭据、无 query/hash 的 HTTPS URL');
  }
  return url.toString().endsWith('/') ? url.toString() : `${url.toString()}/`;
}

export function createElectronBuilderConfig(
  environment: BuildEnvironment,
  rawIdentity: unknown = desktopDefaults,
  platform: 'darwin' | 'win32' = process.platform === 'win32' ? 'win32' : 'darwin',
): Configuration {
  const identity: DesktopPackagingConfig = parseDesktopPackagingConfig(rawIdentity);
  const releaseBuild = parseBoolean(environment, 'DESKTOP_RELEASE_BUILD');
  const spikeBuild = parseBoolean(environment, 'DESKTOP_SPIKE_MODE');
  const updateBaseUrl = requireUpdateBaseUrl(environment);
  let macIdentity: string | null = null;
  let notarize = false;
  let windowsPublisher: string | null = null;

  if (releaseBuild) {
    const releaseIdentity = requireReleaseIdentity(identity, platform);
    if (platform === 'darwin') {
      macIdentity = requireSecret(environment, 'CSC_NAME');
      requireSecret(environment, 'APPLE_ID');
      requireSecret(environment, 'APPLE_APP_SPECIFIC_PASSWORD');
      const teamId = requireSecret(environment, 'APPLE_TEAM_ID');
      if (teamId !== releaseIdentity.macTeamId) {
        throw new Error('APPLE_TEAM_ID 与 desktop.config.ts 的 macTeamId 不一致');
      }
      notarize = true;
    } else {
      requireSecret(environment, 'CSC_LINK');
      requireSecret(environment, 'CSC_KEY_PASSWORD');
      windowsPublisher = releaseIdentity.windowsPublisher;
    }
  }

  return {
    appId: identity.appId,
    productName: identity.productName,
    executableName: identity.executableName,
    copyright: identity.copyright,
    asar: true,
    disableAsarIntegrity: false,
    afterPack: spikeBuild ? null : 'scripts/after-pack-fuses.cjs',
    directories: { output: 'release' },
    files: ['out/**', 'package.json', '!node_modules/**'],
    extraMetadata: {
      version: packageVersion,
      description: 'Web 与 Electron 双宿主后台管理脚手架',
      author: 'Unconfigured Scaffold Maintainer',
    },
    artifactName: '${name}-${version}-${arch}.${ext}',
    mac: {
      icon: 'build/icon.png',
      identity: macIdentity,
      notarize,
      hardenedRuntime: true,
      target: ['dmg', 'zip'],
    },
    win: {
      icon: 'build/icon.png',
      signtoolOptions: windowsPublisher ? { publisherName: windowsPublisher } : undefined,
      target: ['nsis'],
    },
    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      artifactName: '${name}-Setup-${version}.${ext}',
    },
    publish: { provider: 'generic', url: updateBaseUrl },
  };
}

export default function electronBuilderConfig(): Configuration {
  return createElectronBuilderConfig(process.env);
}
