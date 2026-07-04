import {
  ChevronDown,
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
import { TableShell, TableShellHeader, TableShellRow } from '@/components/pro/TableShell';
import type { ManagedMenuRow } from './menu-management-model';
import type { MenuRecord } from '@/modules/types';

const gridTemplate =
  '2fr 1.35fr calc(88px * var(--app-scale)) 1.3fr calc(92px * var(--app-scale)) calc(150px * var(--app-scale))';

const typeClass: Record<MenuRecord['type'], string> = {
  dir: 'bg-pri-soft text-pri',
  menu: 'bg-success-soft text-success',
  action: 'bg-warning-soft text-warning',
};

export interface MenuTreeTableProps {
  rows: ManagedMenuRow[];
  collapsedIds: string[];
  locale: string;
  t: TFunction<'admin'>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canToggle: boolean;
  onToggleCollapse: (id: string) => void;
  onAddChild: (menu: MenuRecord) => void;
  onEdit: (menu: MenuRecord) => void;
  onDelete: (menu: MenuRecord) => void;
  onSetVisibility: (id: string, visible: boolean) => void;
}

function menuName(menu: MenuRecord, locale: string) {
  return lv(menu.label, locale);
}

function VisibilityStatus({ menu }: { menu: MenuRecord }) {
  const visibleLabel = menu.visible ? '显示' : '隐藏';
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-5 px-2 py-0.5 text-xs',
        menu.visible ? 'bg-success-soft text-success' : 'bg-surface-2 text-text-3',
      )}
    >
      {menu.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
      <span>{visibleLabel}</span>
    </span>
  );
}

export function MenuTreeTable({
  rows,
  collapsedIds,
  locale,
  t,
  canCreate,
  canUpdate,
  canDelete,
  canToggle,
  onToggleCollapse,
  onAddChild,
  onEdit,
  onDelete,
  onSetVisibility,
}: MenuTreeTableProps) {
  const collapsed = new Set(collapsedIds);
  return (
    <TableShell
      className="min-w-[calc(920px*var(--app-scale))]"
      empty={
        <div className="flex flex-col items-center gap-1">
          <span>{t('menus.empty.title')}</span>
          <span className="text-xs text-text-3">{t('menus.empty.desc')}</span>
        </div>
      }
      header={
        <TableShellHeader gridTemplateColumns={gridTemplate}>
          <div>{t('menus.columns.name')}</div>
          <div>{t('menus.columns.path')}</div>
          <div>{t('menus.columns.type')}</div>
          <div>{t('menus.columns.permission')}</div>
          <div>{t('menus.columns.visible')}</div>
          <div>{t('menus.columns.actions')}</div>
        </TableShellHeader>
      }
    >
      {rows.length > 0
        ? rows.map(({ menu, depth, hasChildren }) => {
            const name = menuName(menu, locale);
            return (
              <TableShellRow key={menu.id} gridTemplateColumns={gridTemplate}>
                <div
                  className="flex min-w-0 items-center gap-2"
                  style={{ paddingLeft: `calc(${depth * 24}px * var(--app-scale))` }}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      className="flex size-6 shrink-0 items-center justify-center rounded-6 text-text-3 hover:bg-bg hover:text-text"
                      aria-label={t('menus.actions.toggleNode', { name })}
                      onClick={() => onToggleCollapse(menu.id)}
                    >
                      {collapsed.has(menu.id) ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                  ) : (
                    <span className="flex size-6 shrink-0 items-center justify-center text-text-3">
                      <ChevronRight className="size-3 opacity-30" />
                    </span>
                  )}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-8 bg-pri-soft text-pri">
                    <Icon name={menu.icon} className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-text">{name}</div>
                    <div className="truncate text-xs text-text-3">{menu.id}</div>
                  </div>
                </div>
                <div className="truncate text-sm text-text-2">{menu.path ?? '-'}</div>
                <div>
                  <span className={cn('inline-flex rounded-5 px-2 py-0.5 text-xs', typeClass[menu.type])}>
                    {t(`menus.types.${menu.type}`)}
                  </span>
                </div>
                <div className="truncate text-sm text-text-2">{menu.permission ?? '-'}</div>
                <div>
                  {canToggle ? (
                    <Switch
                      aria-label={t('menus.actions.toggleVisible', { name })}
                      checked={menu.visible}
                      className="data-[state=checked]:bg-success"
                      size="sm"
                      onCheckedChange={(checked) => onSetVisibility(menu.id, checked)}
                    />
                  ) : (
                    <VisibilityStatus menu={menu} />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {canCreate && menu.type !== 'action' && (
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
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
                      title={t('menus.actions.delete')}
                      aria-label={t('menus.actions.deleteName', { name })}
                      onClick={() => onDelete(menu)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </TableShellRow>
            );
          })
        : null}
    </TableShell>
  );
}
