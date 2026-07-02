import type { MenuRecord } from '@/modules/types';
import { matchPermission } from '@/lib/permission';

export interface MenuNode extends MenuRecord {
  children?: MenuNode[];
}

// 扁平菜单记录 → 两级树：过滤 action/不可见/无权限项，再按 parentId 组树，最后剪掉空目录
export function buildMenuTree(records: MenuRecord[], permissions: string[]): MenuNode[] {
  const visible = records.filter(
    (r) =>
      r.type !== 'action' &&
      r.visible &&
      (!r.permission || matchPermission(permissions, r.permission)),
  );
  const byParent = new Map<string | null, MenuNode[]>();
  for (const r of [...visible].sort((a, b) => a.sort - b.sort)) {
    const list = byParent.get(r.parentId) ?? [];
    list.push({ ...r });
    byParent.set(r.parentId, list);
  }
  const attach = (n: MenuNode): MenuNode => ({
    ...n,
    children: (byParent.get(n.id) ?? []).map(attach),
  });
  return (byParent.get(null) ?? [])
    .map(attach)
    .filter((n) => n.type === 'menu' || (n.children != null && n.children.length > 0)); // 剪空目录
}
