import { describe, expect, test } from 'vitest';
import { desktopDefaults, parseDesktopPackagingConfig, requireReleaseIdentity } from '../../desktop.config';

describe('desktop packaging config', () => {
  test('keeps the scaffold identity explicitly non-publishable while allowing development packages', () => {
    expect(parseDesktopPackagingConfig(desktopDefaults)).toMatchObject({
      appId: 'dev.unconfigured.admin-scaffold',
      productName: 'Admin Scaffold Development',
      executableName: 'admin-scaffold-development',
      releaseIdentityConfigured: false,
      macTeamId: null,
      windowsPublisher: null,
    });
  });

  test('rejects placeholder identity when a derived project claims release readiness', () => {
    const claimedRelease = { ...desktopDefaults, releaseIdentityConfigured: true };
    expect(() => requireReleaseIdentity(claimedRelease, 'darwin')).toThrow('macOS 发布身份');
    expect(() => requireReleaseIdentity(claimedRelease, 'win32')).toThrow('Windows 发布身份');
  });

  test('accepts explicit fixed publisher identities for each release platform', () => {
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
    expect(requireReleaseIdentity(configured, 'darwin').macTeamId).toBe('A1B2C3D4E5');
    expect(requireReleaseIdentity(configured, 'win32').windowsPublisher).toBe('Example Inc.');
  });

  test('rejects unsafe application identity fields before electron-builder starts', () => {
    expect(() => parseDesktopPackagingConfig({ ...desktopDefaults, appId: '../unsafe' })).toThrow('appId');
    expect(() => parseDesktopPackagingConfig({ ...desktopDefaults, executableName: 'unsafe/name' })).toThrow(
      'executableName',
    );
  });
});
