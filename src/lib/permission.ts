// 权限符匹配（RuoYi 风格 `域:资源:动作`，支持 `*` 段通配 / `*:*:*` 超管）
export function matchPermission(owned: string[], need: string): boolean {
  const needSeg = need.split(':');
  return owned.some((p) => {
    const seg = p.split(':');
    if (seg.includes('*')) {
      // 前缀段逐一比对，遇 * 通配其后全部
      for (let i = 0; i < needSeg.length; i++) {
        if (seg[i] === '*') return true;
        if (seg[i] !== needSeg[i]) return false;
      }
      return true;
    }
    return p === need;
  });
}
