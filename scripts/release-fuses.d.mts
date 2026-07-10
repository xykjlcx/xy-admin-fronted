import type { FuseConfig, FuseState } from '@electron/fuses';

export const releaseFuseConfig: Readonly<FuseConfig>;
export function assertReleaseFuseWire<T extends FuseConfig<FuseState>>(wire: T): T;
export function flipAndVerifyReleaseFuses(binaryOrAppPath: string): Promise<FuseConfig<FuseState>>;
export function verifyReleaseFuseWire(binaryOrAppPath: string): Promise<FuseConfig<FuseState>>;
