import {
  ChevronRight,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { Icon } from '@/lib/icon-registry';
import { lv } from '@/lib/localized';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { ManagedMenuRow } from './menu-management-model';
import type { MenuRecord } from '@/modules/types';

const gridTemplate =
  'minmax(calc(220px * var(--app-scale)), 1fr) minmax(calc(160px * var(--app-scale)), 0.75fr) calc(72px * var(--app-scale)) calc(92px * var(--app-scale))';

const typeClass: Record<MenuRecord['type'], string> = {
  dir: 'bg-(--accent-emphasis-soft) text-(--accent-emphasis)',
  menu: 'bg-success-soft text-success',
  action: 'bg-warning-soft text-warning',
};

export interface MenuTreeTableProps {
  rows: ManagedMenuRow[];
  collapsedIds: string[];
  selectedMenuId: string | null;
  locale: string;
  t: TFunction<'admin'>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canToggle: boolean;
  onSelect: (menu: MenuRecord) => void;
  onToggleCollapse: (id: string) => void;
  onAddChild: (menu: MenuRecord) => void;
  onEdit: (menu: MenuRecord) => void;
  onDelete: (menu: MenuRecord) => void;
  onSetVisibility: (id: string, visible: boolean) => void;
}

function menuName(menu: MenuRecord, locale: string) {
  return lv(menu.label, locale);
}

function VisibilityStatus({ menu, t }: { menu: MenuRecord; t: TFunction<'admin'> }) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-5 px-2 py-0.5 text-xs',
        menu.visible ? 'bg-success-soft text-success' : 'bg-(--table-header-bg) text-text-3',
      )}
    >
      {menu.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
      <span>{menu.visible ? t('menus.inspector.visible') : t('menus.inspector.hidden')}</span>
    </span>
  );
}

export function MenuTreeTable({
  rows,
  collapsedIds,
  selectedMenuId,
  locale,
  t,
  canCreate,
  canUpdate,
  canDelete,
  canToggle,
  onSelect,
  onToggleCollapse,
  onAddChild,
  onEdit,
  onDelete,
  onSetVisibility,
}: MenuTreeTableProps) {
  const collapsed = new Set(collapsedIds);
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[calc(260px*var(--app-scale))] items-center justify-center rounded-12 bg-(--table-bg) text-sm text-(--table-header-fg)">
        <div className="flex flex-col items-center gap-1">
          <span>{t('menus.empty.title')}</span>
          <span className="text-xs text-text-3">{t('menus.empty.desc')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-[calc(560px*var(--app-scale))]">
      <div
        className="mb-2 grid px-3 text-xs font-medium text-(--table-header-fg)"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <div>{t('menus.columns.name')}</div>
        <div>{t('menus.columns.meta')}</div>
        <div>{t('menus.columns.visible')}</div>
        <div>{t('menus.columns.actions')}</div>
      </div>
      <div className="overflow-hidden rounded-12 bg-(--table-bg)">
        {rows.map(({ menu, depth, hasChildren, hiddenByCollapse }) => {
          const name = menuName(menu, locale);
          const rowCollapsed = collapsed.has(menu.id);
          const selected = selectedMenuId === menu.id;
          return (
            <div
              key={menu.id}
              data-menu-tree-row
              data-collapsed-hidden={hiddenByCollapse || undefined}
              className={cn(
                'grid transition-[grid-template-rows,opacity] duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
                hiddenByCollapse ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  aria-hidden={hiddenByCollapse}
                  inert={hiddenByCollapse || undefined}
                  className={cn(
                    'group/menu-row grid min-h-[calc(54px*var(--app-scale))] items-center border-b border-(--table-row-border) px-3 py-2 transition-colors last:border-b-0 hover:bg-(--fill-hover)',
                    selected && 'bg-(--nav-item-bg-current) hover:bg-(--nav-item-bg-current)',
                    hiddenByCollapse && 'pointer-events-none',
                  )}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  <div
                    className="flex min-w-0 items-center gap-2"
                    style={{ paddingLeft: `calc(${depth * 22}px * var(--app-scale))` }}
                  >
                    {hasChildren ? (
                      <button
                        type="button"
                        className="flex size-6 shrink-0 items-center justify-center rounded-6 text-text-3 hover:bg-(--fill-hover) hover:text-text"
                        aria-label={t('menus.actions.toggleNode', { name })}
                        aria-expanded={!rowCollapsed}
                        onClick={() => onToggleCollapse(menu.id)}
                      >
                        <ChevronRight
                          className={cn(
                            'size-4 transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
                            !rowCollapsed && 'rotate-90',
                          )}
                        />
                      </button>
                    ) : (
                      <span className="flex size-6 shrink-0 items-center justify-center text-text-3">
                        <ChevronRight className="size-3 opacity-30" />
                      </span>
                    )}
                    <button
                      type="button"
                      aria-pressed={selected}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-8 py-1 text-left"
                      onClick={() => onSelect(menu)}
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-8',
                          selected
                            ? 'bg-(--pro-panel-bg) text-(--nav-item-fg-current)'
                            : 'bg-(--accent-emphasis-soft) text-(--accent-emphasis)',
                        )}
                      >
                        <Icon name={menu.icon} className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-text">{name}</span>
                        <span className="block truncate text-xs text-text-3">{menu.id}</span>
                      </span>
                    </button>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn('inline-flex shrink-0 rounded-5 px-2 py-0.5 text-xs', typeClass[menu.type])}>
                        {t(`menus.types.${menu.type}`)}
                      </span>
                      <span className="truncate text-xs text-text-3">{menu.path ?? t('menus.inspector.emptyValue')}</span>
                    </div>
                    <div className="truncate text-xs text-text-3">
                      {menu.permission ?? t('menus.inspector.emptyValue')}
                    </div>
                  </div>
                  <div>
                    {canToggle ? (
                      <Switch
                        aria-label={t('menus.actions.toggleVisible', { name })}
                        checked={menu.visible}
                        size="sm"
                        onCheckedChange={(checked) => onSetVisibility(menu.id, checked)}
                      />
                    ) : (
                      <VisibilityStatus menu={menu} t={t} />
                    )}
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1 transition-opacity',
                      selected
                        ? 'opacity-100'
                        : 'opacity-0 group-hover/menu-row:opacity-100 group-focus-within/menu-row:opacity-100',
                    )}
                  >
                    {canCreate && menu.type !== 'action' && (
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-(--table-action-fg)"
                        title={t('menus.actions.addChild')}
                        aria-label={t('menus.actions.addChildName', { name })}
                        onClick={() => onAddChild(menu)}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    )}
                    {canUpdate && (
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-(--table-action-fg)"
                        title={t('menus.actions.edit')}
                        aria-label={t('menus.actions.editName', { name })}
                        onClick={() => onEdit(menu)}
                      >
                        <Edit3 className="size-3.5" />
                      </Button>
                    )}
                    {canDelete && !hasChildren && (
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-(--table-action-fg)"
                        title={t('menus.actions.delete')}
                        aria-label={t('menus.actions.deleteName', { name })}
                        onClick={() => onDelete(menu)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
