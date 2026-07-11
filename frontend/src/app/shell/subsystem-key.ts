// URL 第一段 = 子系统 key（spec §4）。Shell 与 SubsystemSwitcher 共用此约定，避免各自硬编码分段逻辑。
export function subsystemKeyFromPath(pathname: string): string {
  const key = pathname.split('/')[1];
  // 路由过渡期间旧 Shell 可能短暂看到登录页 location；它不是业务子系统，必须复用已缓存的 admin
  // key，避免凭证已清空时额外请求 `/api/menus?subsystem=login`。
  if (!key || key === 'login' || key === 'register' || key === 'forgot-password' || key === '403') return 'admin';
  return key;
}
