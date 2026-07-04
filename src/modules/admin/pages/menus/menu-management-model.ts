import { lv } from '@/lib/localized';
import type { MenuRecord } from '@/modules/types';

export interface ManagedMenuRow {
  menu: MenuRecord;
  depth: number;
  hasChildren: boolean;
}

export interface MenuStats {
  dirCount: number;
  menuCount: number;
  actionCount: number;
  hiddenCount: number;
}

function menuLabel(menu: MenuRecord, locale: string) {
  return lv(menu.label, locale);
}

function sortMenus(locale: string) {
  return (a: MenuRecord, b: MenuRecord) =>
    a.sort - b.sort || menuLabel(a, locale).localeCompare(menuLabel(b, locale), locale);
}

function matchesKeyword(menu: MenuRecord, locale: string, keyword: string) {
  if (!keyword) return true;
  const haystack = [menuLabel(menu, locale), menu.path ?? '', menu.permission ?? '', menu.icon ?? '']
    .join(' ')
    .toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

export function countMenuStats(menus: MenuRecord[]): MenuStats {
  return menus.reduce<MenuStats>(
    (stats, menu) => {
      if (menu.type === 'dir') stats.dirCount += 1;
      if (menu.type === 'menu') stats.menuCount += 1;
      if (menu.type === 'action') stats.actionCount += 1;
      if (!menu.visible) stats.hiddenCount += 1;
      return stats;
    },
    { dirCount: 0, menuCount: 0, actionCount: 0, hiddenCount: 0 },
  );
}

export function nextSiblingSort(menus: MenuRecord[], subsystemKey: string, parentId: string | null) {
  return (
    Math.max(
      0,
      ...menus
        .filter((menu) => menu.subsystemKey === subsystemKey && menu.parentId === parentId)
        .map((menu) => menu.sort),
    ) + 1
  );
}

export function buildManagedMenuRows(
  menus: MenuRecord[],
  collapsedIds: string[],
  locale: string,
  keyword: string,
): ManagedMenuRow[] {
  const collapsed = new Set(collapsedIds);
  const normalizedKeyword = keyword.trim();
  const byParent = new Map<string | null, MenuRecord[]>();
  for (const menu of [...menus].sort(sortMenus(locale))) {
    const siblings = byParent.get(menu.parentId) ?? [];
    siblings.push(menu);
    byParent.set(menu.parentId, siblings);
  }

  const hasMatchingDescendant = (id: string): boolean =>
    (byParent.get(id) ?? []).some(
      (child) => matchesKeyword(child, locale, normalizedKeyword) || hasMatchingDescendant(child.id),
    );

  const rows: ManagedMenuRow[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const menu of byParent.get(parentId) ?? []) {
      const children = byParent.get(menu.id) ?? [];
      const hasChildren = children.length > 0;
      const shouldInclude =
        !normalizedKeyword ||
        matchesKeyword(menu, locale, normalizedKeyword) ||
        hasMatchingDescendant(menu.id);
      if (!shouldInclude) continue;

      rows.push({ menu, depth, hasChildren });
      if (!collapsed.has(menu.id)) walk(menu.id, depth + 1);
    }
  };

  walk(null, 0);
  return rows;
}

export function hasMenuChildren(menus: MenuRecord[], id: string) {
  return menus.some((menu) => menu.parentId === id);
}

export function collapsibleMenuIds(menus: MenuRecord[]) {
  const parentIds = new Set(menus.map((menu) => menu.parentId).filter((id): id is string => !!id));
  return menus.filter((menu) => parentIds.has(menu.id)).map((menu) => menu.id);
}
