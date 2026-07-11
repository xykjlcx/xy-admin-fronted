// URL 第一段 = 子系统 key（spec §4）。Shell 与 SubsystemSwitcher 共用此约定，避免各自硬编码分段逻辑。
export function subsystemKeyFromPath(pathname: string): string {
  return pathname.split('/')[1] || 'admin';
}
