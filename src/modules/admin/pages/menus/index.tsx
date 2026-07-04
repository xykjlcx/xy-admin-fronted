import { useMemo, useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { ChevronsDown, ChevronsUp, Grid2X2, Plus, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/lib/icon-registry';
import { lv } from '@/lib/localized';
import { matchPermission } from '@/lib/permission';
import { cn } from '@/lib/utils';
import {
  menuApi,
  menusQuery,
  subsystemsQuery,
  type CreateMenuInput,
  type ManagedMenuType,
  type UpdateMenuInput,
} from '@/modules/admin/api/menu.api';
import { MenuFormDialog } from './MenuFormDialog';
import { MenuTreeTable } from './MenuTreeTable';
import {
  buildManagedMenuRows,
  collapsibleMenuIds,
  countMenuStats,
} from './menu-management-model';
import type { MenuRecord, Subsystem } from '@/modules/types';

export interface MenusViewProps {
  permissions: string[];
  subsystems: Subsystem[];
  activeSubsystemKey: string;
  menus: MenuRecord[];
  refreshing?: boolean;
  onActiveSubsystemChange: (key: string) => void;
  onCreateMenu: (dto: CreateMenuInput) => void | Promise<void>;
  onUpdateMenu: (id: string, dto: UpdateMenuInput) => void | Promise<void>;
  onDeleteMenu: (id: string) => void | Promise<void>;
  onSetMenuVisibility: (id: string, visible: boolean) => void | Promise<void>;
}

type FormState =
  | { mode: 'create'; parentId: string | null; type: ManagedMenuType }
  | { mode: 'edit'; menu: MenuRecord }
  | null;

export interface MenusPageProps {
  permissions: string[];
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function subsystemLabel(subsystem: Subsystem | undefined, locale: string) {
  return lv(subsystem?.label, locale) || '-';
}

function menuLabel(menu: MenuRecord | null, locale: string) {
  return menu ? lv(menu.label, locale) : '';
}

export function MenusPage({ permissions }: MenusPageProps) {
  // 菜单管理是 Shell 导航的维护入口，保存后必须失效 nav/menus 前缀。
  // 这样侧边栏和当前页面表格都能从同一份 Query 缓存更新。
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const { data: subsystems } = useSuspenseQuery(subsystemsQuery);
  const [activeSubsystemKey, setActiveSubsystemKey] = useState(() => subsystems[0]?.key ?? 'admin');
  const fallbackSubsystemKey = subsystems[0]?.key ?? 'admin';
  const effectiveSubsystemKey = subsystems.some((subsystem) => subsystem.key === activeSubsystemKey)
    ? activeSubsystemKey
    : fallbackSubsystemKey;
  const { data: menus, isFetching } = useSuspenseQuery(menusQuery(effectiveSubsystemKey));

  const invalidateMenus = async () => {
    await queryClient.invalidateQueries({ queryKey: ['nav', 'menus'] });
  };
  const createMenu = useMutation({
    mutationFn: menuApi.createMenu,
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.created'));
    },
    onError: (error) => toast.error(errorMessage(error, t('menus.toast.failed'))),
  });
  const updateMenu = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMenuInput }) => menuApi.updateMenu(id, dto),
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.updated'));
    },
    onError: (error) => toast.error(errorMessage(error, t('menus.toast.failed'))),
  });
  const deleteMenu = useMutation({
    mutationFn: menuApi.deleteMenu,
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.deleted'));
    },
    onError: (error) => toast.error(errorMessage(error, t('menus.toast.failed'))),
  });
  const setMenuVisibility = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      menuApi.setMenuVisibility(id, { visible }),
    onSuccess: async () => {
      await invalidateMenus();
      toast.success(t('menus.toast.visibilityUpdated'));
    },
    onError: (error) => toast.error(errorMessage(error, t('menus.toast.failed'))),
  });

  return (
    <MenusView
      permissions={permissions}
      subsystems={subsystems}
      activeSubsystemKey={effectiveSubsystemKey}
      menus={menus}
      refreshing={isFetching}
      onActiveSubsystemChange={setActiveSubsystemKey}
      onCreateMenu={async (dto: CreateMenuInput) => {
        await createMenu.mutateAsync(dto);
      }}
      onUpdateMenu={async (id: string, dto: UpdateMenuInput) => {
        await updateMenu.mutateAsync({ id, dto });
      }}
      onDeleteMenu={async (id: string) => {
        await deleteMenu.mutateAsync(id);
      }}
      onSetMenuVisibility={async (id: string, visible: boolean) => {
        await setMenuVisibility.mutateAsync({ id, visible });
      }}
    />
  );
}

export function MenusView({
  permissions,
  subsystems,
  activeSubsystemKey,
  menus,
  refreshing = false,
  onActiveSubsystemChange,
  onCreateMenu,
  onUpdateMenu,
  onDeleteMenu,
  onSetMenuVisibility,
}: MenusViewProps) {
  const { t, i18n } = useTranslation('admin');
  const locale = i18n.language;
  const [keyword, setKeyword] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const [formState, setFormState] = useState<FormState>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuRecord | null>(null);
  const activeSubsystem = subsystems.find((subsystem) => subsystem.key === activeSubsystemKey) ?? subsystems[0];
  const activeKey = activeSubsystem?.key ?? activeSubsystemKey;
  const stats = useMemo(() => countMenuStats(menus), [menus]);
  const rows = useMemo(
    () => buildManagedMenuRows(menus, collapsedIds, locale, keyword),
    [collapsedIds, keyword, locale, menus],
  );
  const allCollapsibleIds = useMemo(() => collapsibleMenuIds(menus), [menus]);
  const canCreate = matchPermission(permissions, 'iam:menu:create');
  const canUpdate = matchPermission(permissions, 'iam:menu:update');
  const canDelete = matchPermission(permissions, 'iam:menu:del');
  const canToggle = matchPermission(permissions, 'iam:menu:toggle');
  const activeSubsystemName = subsystemLabel(activeSubsystem, locale);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };
  const openAddChild = (menu: MenuRecord) => {
    setFormState({ mode: 'create', parentId: menu.id, type: menu.type === 'menu' ? 'action' : 'menu' });
  };
  const closeForm = () => setFormState(null);
  const submitForm = async (dto: UpdateMenuInput) => {
    if (!formState) return;
    if (formState.mode === 'create') {
      await onCreateMenu({ subsystemKey: activeKey, ...dto });
    } else {
      await onUpdateMenu(formState.menu.id, dto);
    }
    closeForm();
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeleteMenu(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <section
      className="flex min-h-0 flex-col text-text"
      style={{ padding: 'calc(20px * var(--app-scale)) calc(28px * var(--app-scale))' }}
    >
      <div className="mb-4 flex items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-3">
        <span>{t('menus.breadcrumbGroup')}</span>
        <span>›</span>
        <span className="text-text">{t('menus.title')}</span>
      </div>

      <div className="flex min-h-[calc(680px*var(--app-scale))] flex-col overflow-hidden rounded-12 border border-border bg-surface shadow-xs">
        <div className="border-b border-border px-6 py-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 items-center justify-center rounded-10 bg-pri-soft text-pri">
                <Grid2X2 className="size-5" />
              </span>
              <div>
                <h1 className="text-base font-bold text-text">{t('menus.subsystems.title')}</h1>
                <p className="mt-1 text-sm text-text-3">{t('menus.subsystems.desc')}</p>
              </div>
            </div>
            {refreshing && <span className="text-xs text-text-3">{t('menus.refreshing')}</span>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {subsystems.map((subsystem) => {
              const active = subsystem.key === activeKey;
              const label = subsystemLabel(subsystem, locale);
              return (
                <button
                  key={subsystem.key}
                  type="button"
                  className={cn(
                    'min-h-[calc(112px*var(--app-scale))] rounded-10 border bg-surface p-4 text-left transition-colors hover:border-pri',
                    active ? 'border-pri shadow-xs' : 'border-border',
                  )}
                  onClick={() => onActiveSubsystemChange(subsystem.key)}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-8 bg-pri-soft text-pri">
                        <Icon name={subsystem.icon} className="size-4" />
                      </span>
                      <span className="truncate text-sm font-semibold text-text">{label}</span>
                    </div>
                    {subsystem.builtin && (
                      <span className="rounded-5 bg-pri-soft px-2 py-0.5 text-xs text-pri">
                        {t('menus.subsystems.builtin')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs leading-5 text-text-3">{lv(subsystem.desc, locale)}</div>
                  <div className="mt-2 text-xs text-text-3">
                    {t('menus.subsystems.menuCount', { count: active ? menus.length : 0 })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 py-[calc(18px*var(--app-scale))]">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div>
              <div className="text-base font-bold text-text">
                {t('menus.treeTitle', { subsystem: activeSubsystemName })}
              </div>
              <div className="mt-1 text-[calc(13px*var(--app-scale))] text-text-3">
                {t('menus.stats', {
                  dirs: stats.dirCount,
                  menus: stats.menuCount,
                  actions: stats.actionCount,
                  hidden: stats.hiddenCount,
                })}
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex h-[calc(34px*var(--app-scale))] w-[calc(280px*var(--app-scale))] items-center gap-2 rounded-8 border border-border bg-surface px-3">
              <Search className="size-4 text-text-3" />
              <input
                value={keyword}
                placeholder={t('menus.searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-3"
                onChange={(event) => setKeyword(event.currentTarget.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setCollapsedIds([])}>
              <ChevronsDown className="size-4" />
              {t('menus.actions.expand')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCollapsedIds(allCollapsibleIds)}>
              <ChevronsUp className="size-4" />
              {t('menus.actions.collapse')}
            </Button>
            {canCreate && (
              <Button size="sm" className="bg-pri text-white hover:bg-pri-hover" onClick={() => setFormState({ mode: 'create', parentId: null, type: 'dir' })}>
                <Plus className="size-4" />
                {t('menus.actions.create')}
              </Button>
            )}
          </div>

          <div className="min-h-0 overflow-auto">
            <MenuTreeTable
              rows={rows}
              collapsedIds={collapsedIds}
              locale={locale}
              t={t}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              canToggle={canToggle}
              onToggleCollapse={toggleCollapse}
              onAddChild={openAddChild}
              onEdit={(menu) => setFormState({ mode: 'edit', menu })}
              onDelete={setDeleteTarget}
              onSetVisibility={(id, visible) => {
                void onSetMenuVisibility(id, visible);
              }}
            />
          </div>
        </div>
      </div>

      {formState && (
        <MenuFormDialog
          open
          mode={formState.mode}
          subsystemKey={activeKey}
          menus={menus}
          locale={locale}
          t={t}
          initialMenu={formState.mode === 'edit' ? formState.menu : null}
          initialParentId={formState.mode === 'create' ? formState.parentId : null}
          initialType={formState.mode === 'create' ? formState.type : undefined}
          onOpenChange={(open) => {
            if (!open) closeForm();
          }}
          onSubmit={submitForm}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('menus.dialog.deleteTitle')}
        description={t('menus.dialog.deleteDesc', { name: menuLabel(deleteTarget, locale) })}
        cancelText={t('menus.actions.cancel')}
        confirmText={t('menus.actions.confirmDelete')}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
