import { FuseState, FuseV1Options, FuseVersion } from '@electron/fuses';
import { describe, expect, test } from 'vitest';
import { assertReleaseFuseWire, releaseFuseConfig } from './release-fuses.mjs';

describe('release fuse profile', () => {
  test('defines every Electron 43 fuse explicitly and keeps the security profile fixed', () => {
    expect(releaseFuseConfig.strictlyRequireAllFuses).toBe(true);
    expect(releaseFuseConfig).toMatchObject({
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
      [FuseV1Options.WasmTrapHandlers]: true,
    });
  });

  test('accepts only a real wire with every expected fuse enabled or disabled', () => {
    const wire = {
      version: FuseVersion.V1,
      strictlyRequireAllFuses: true as const,
      [FuseV1Options.RunAsNode]: FuseState.DISABLE,
      [FuseV1Options.EnableCookieEncryption]: FuseState.ENABLE,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: FuseState.DISABLE,
      [FuseV1Options.EnableNodeCliInspectArguments]: FuseState.DISABLE,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: FuseState.ENABLE,
      [FuseV1Options.OnlyLoadAppFromAsar]: FuseState.ENABLE,
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: FuseState.DISABLE,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: FuseState.DISABLE,
      [FuseV1Options.WasmTrapHandlers]: FuseState.ENABLE,
    };
    expect(assertReleaseFuseWire(wire)).toEqual(wire);
    expect(() =>
      assertReleaseFuseWire({
        ...wire,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: FuseState.INHERIT,
      }),
    ).toThrow('EnableNodeOptionsEnvironmentVariable');
  });
});
