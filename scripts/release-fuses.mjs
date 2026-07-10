import { flipFuses, FuseState, FuseV1Options, FuseVersion, getCurrentFuseWire } from '@electron/fuses';

export const releaseFuseConfig = Object.freeze({
  version: FuseVersion.V1,
  strictlyRequireAllFuses: true,
  resetAdHocDarwinSignature: true,
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableCookieEncryption]: true,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
  [FuseV1Options.OnlyLoadAppFromAsar]: true,
  // 当前产物不提供 browser_v8_context_snapshot，显式关闭并防止 Electron 升级时默认值漂移。
  [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
  [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  [FuseV1Options.WasmTrapHandlers]: true,
});

const expectedWire = new Map([
  [FuseV1Options.RunAsNode, FuseState.DISABLE],
  [FuseV1Options.EnableCookieEncryption, FuseState.ENABLE],
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable, FuseState.DISABLE],
  [FuseV1Options.EnableNodeCliInspectArguments, FuseState.DISABLE],
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation, FuseState.ENABLE],
  [FuseV1Options.OnlyLoadAppFromAsar, FuseState.ENABLE],
  [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot, FuseState.DISABLE],
  [FuseV1Options.GrantFileProtocolExtraPrivileges, FuseState.DISABLE],
  [FuseV1Options.WasmTrapHandlers, FuseState.ENABLE],
]);

export function assertReleaseFuseWire(wire) {
  if (wire.version !== FuseVersion.V1) throw new Error(`Fuse wire 版本无效: ${String(wire.version)}`);
  for (const [option, expected] of expectedWire) {
    if (wire[option] !== expected) {
      throw new Error(
        `Fuse ${FuseV1Options[option]} 实际值 ${String(wire[option])} 与 release profile ${String(expected)} 不一致`,
      );
    }
  }
  return wire;
}

export async function flipAndVerifyReleaseFuses(binaryOrAppPath) {
  await flipFuses(binaryOrAppPath, releaseFuseConfig);
  return assertReleaseFuseWire(await getCurrentFuseWire(binaryOrAppPath));
}

export async function verifyReleaseFuseWire(binaryOrAppPath) {
  return assertReleaseFuseWire(await getCurrentFuseWire(binaryOrAppPath));
}
