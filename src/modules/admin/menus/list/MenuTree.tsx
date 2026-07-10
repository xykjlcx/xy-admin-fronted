import type { TFunction } from 'i18next';
import { CirclePlus } from 'lucide-react';
import { Tree, type TreeNode } from '@/components/pro/Tree';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/lib/icon-registry';
import { lv } from '@/lib/localized';
import type { ManagedMenuRow } from '../model';
import type { MenuRecord } from '@/modules/types';

const typeBadge: Record<'dir' | 'menu', 'primary' | 'success'> = {
  dir: 'primary',
  menu: 'success',
};

interface MenuTreeProps {
  rows: ManagedMenuRow[];
  collapsedIds: string[];
  selectedMenuId: string | null;
  locale: string;
  t: TFunction<'admin'>;
  canCreate: boolean;
  onSelect: (menu: MenuRecord) => void;
  onAddChild: (menu: MenuRecord) => void;
  onToggleCollapse: (id: string) => void;
}

export function MenuTree({
  rows,
  collapsedIds,
  selectedMenuId,
  locale,
  t,
  canCreate,
  onSelect,
  onAddChild,
  onToggleCollapse,
}: MenuTreeProps) {
  const collapsed = new Set(collapsedIds);
  const menuById = new Map(rows.map((row) => [row.menu.id, row.menu]));
  const nodes: TreeNode[] = rows.map(({ menu, depth, hasChildren, hiddenByCollapse }) => {
    const name = lv(menu.label, locale);
    return {
      id: menu.id,
      label: name,
      depth,
      meta: menu.id,
      leading: <Icon name={menu.icon} />,
      expandable: hasChildren,
      expanded: !collapsed.has(menu.id),
      toggleLabel: t('menus.actions.toggleNode', { name }),
      hidden: hiddenByCollapse,
      trailing: (
        <>
          {canCreate && menu.type === 'dir' && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t('menus.actions.addPageName', { name })}
              title={t('menus.actions.addPage')}
              onClick={() => onAddChild(menu)}
            >
              <CirclePlus data-icon="inline" />
            </Button>
          )}
          {!menu.visible && <Badge variant="neutral">{t('menus.inspector.hidden')}</Badge>}
          <Badge variant={typeBadge[menu.type]}>{t(`menus.types.${menu.type}`)}</Badge>
        </>
      ),
    };
  });

  return (
    <Tree
      nodes={nodes}
      selectedId={selectedMenuId ?? undefined}
      ariaLabel={t('menus.treeLabel')}
      empty={`${t('menus.empty.title')} · ${t('menus.empty.desc')}`}
      onToggle={onToggleCollapse}
      onSelect={(id) => {
        const menu = menuById.get(id);
        if (menu) onSelect(menu);
      }}
    />
  );
}
