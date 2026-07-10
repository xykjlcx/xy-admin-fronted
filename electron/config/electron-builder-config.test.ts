import { describe, expect, test } from 'vitest';
import { desktopDefaults } from '../../desktop.config';
import { createElectronBuilderConfig } from '../../electron-builder';

const environment = { DESKTOP_UPDATE_BASE_URL: 'https://updates.example.com' };

describe('electron-builder config', () => {
  test('builds the required native target matrix and applies fuses before signing', () => {
    const config = createElectronBuilderConfig(environment, desktopDefaults, 'darwin');
    expect(config).toMatchObject({
      appId: desktopDefaults.appId,
      productName: desktopDefaults.productName,
      executableName: desktopDefaults.executableName,
      asar: true,
      disableAsarIntegrity: false,
      afterPack: 'scripts/after-pack-fuses.cjs',
      mac: {
        identity: null,
        notarize: false,
        hardenedRuntime: true,
        target: ['dmg', 'zip'],
      },
      win: { target: ['nsis'] },
      publish: { provider: 'generic', url: 'https://updates.example.com/' },
    });
    expect(config.files).toEqual(['out/**', 'package.json', '!node_modules/**']);
    expect(config.extraMetadata).toMatchObject({ version: '0.1.0' });
  });

  test('fails before packaging when a release build uses the scaffold identity', () => {
    expect(() =>
      createElectronBuilderConfig(
        { ...environment, DESKTOP_RELEASE_BUILD: 'true' },
        desktopDefaults,
        'darwin',
      ),
    ).toThrow('macOS 发布身份');
  });

  test('keeps Playwright packaged Spike unfused without weakening normal make artifacts', () => {
    expect(
      createElectronBuilderConfig({ ...environment, DESKTOP_SPIKE_MODE: 'true' }, desktopDefaults, 'darwin')
        .afterPack,
    ).toBeNull();
    expect(createElectronBuilderConfig(environment, desktopDefaults, 'darwin').afterPack).toBe(
      'scripts/after-pack-fuses.cjs',
    );
  });

  test('requires signing and notarization inputs for a configured macOS release', () => {
    const configured = {
      ...desktopDefaults,
      appId: 'com.example.operations',
      productName: 'Example Operations',
      executableName: 'example-operations',
      copyright: 'Copyright © 2026 Example Inc.',
      releaseIdentityConfigured: true,
      macTeamId: 'A1B2C3D4E5',
      windowsPublisher: 'Example Inc.',
    };
    expect(() =>
      createElectronBuilderConfig({ ...environment, DESKTOP_RELEASE_BUILD: 'true' }, configured, 'darwin'),
    ).toThrow('CSC_NAME');
    const config = createElectronBuilderConfig(
      {
        ...environment,
        DESKTOP_RELEASE_BUILD: 'true',
        CSC_NAME: 'Developer ID Application: Example Inc. (A1B2C3D4E5)',
        APPLE_ID: 'release@example.com',
        APPLE_APP_SPECIFIC_PASSWORD: 'injected-secret',
        APPLE_TEAM_ID: 'A1B2C3D4E5',
      },
      configured,
      'darwin',
    );
    expect(config.mac).toMatchObject({
      identity: 'Developer ID Application: Example Inc. (A1B2C3D4E5)',
      notarize: true,
    });
  });

  test('requires a certificate input and fixed publisher for Windows release builds', () => {
    const configured = {
      ...desktopDefaults,
      appId: 'com.example.operations',
      productName: 'Example Operations',
      executableName: 'example-operations',
      copyright: 'Copyright © 2026 Example Inc.',
      releaseIdentityConfigured: true,
      macTeamId: 'A1B2C3D4E5',
      windowsPublisher: 'Example Inc.',
    };
    expect(() =>
      createElectronBuilderConfig({ ...environment, DESKTOP_RELEASE_BUILD: 'true' }, configured, 'win32'),
    ).toThrow('CSC_LINK');
  });
});
