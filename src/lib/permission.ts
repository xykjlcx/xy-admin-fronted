// 权限符匹配（RuoYi 风格 `域:资源:动作`，但本项目权限串段数不固定，如 dashboard:view 只有 2 段）：
// `*` 只通配恰好一段；仅当 `*` 是 pattern 的最后一段时才通配其后剩余所有段（含 0 段——
// 如 `*:*:*` 覆盖 2 段的 `dashboard:view`、`iam:*` 覆盖 `iam:user:view`）。
// 中段 `*`（如 `iam:*:view`）仅对齐当前这一段，不放行其后动作（`iam:*:view` 不覆盖 `iam:user:delete`）。
export function matchPermission(owned: string[], need: string): boolean {
  const needSeg = need.split(':');
  return owned.some((p) => {
    const seg = p.split(':');
    for (let i = 0; i < seg.length; i++) {
      const isLastPatternSeg = i === seg.length - 1;
      if (seg[i] === '*') {
        if (isLastPatternSeg) return true; // 末段 * 通配其后全部（即使剩余 0 段）
        if (needSeg[i] === undefined) return false; // 中段 * 但 need 已耗尽，段数不足
        continue; // 中段 * 只占一段，继续比对下一段
      }
      if (seg[i] !== needSeg[i]) return false;
    }
    return seg.length === needSeg.length; // 非通配收尾：段数必须完全一致
  });
}
