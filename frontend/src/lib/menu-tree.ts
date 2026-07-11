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
  // 自底向上剪枝：先递归组装并剪掉子级空目录，再由父级判定自身——嵌套多级空目录也能整支剪掉
  const prune = (nodes: MenuNode[]): MenuNode[] =>
    nodes
      .map((n) => ({ ...n, children: prune(byParent.get(n.id) ?? []) }))
      .filter((n) => n.type === 'menu' || n.children!.length > 0);
  return prune(byParent.get(null) ?? []);
}
