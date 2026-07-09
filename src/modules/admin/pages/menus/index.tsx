import { useMemo, useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { ChevronsDown, ChevronsUp, Edit3, Grid2X2, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl, type SelectOption } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Icon } from '@/lib/icon-registry';
import { lv } from '@/lib/localized';
import { matchPermission } from '@/lib/permission';
import { cn } from '@/lib/utils';
import {
  menuApi,
  menusQuery,
  subsystemsQuery,
  type CreateMenuInput,
  type CreateSubsystemInput,
  type ManagedMenuType,
  type UpdateMenuInput,
  type UpdateSubsystemInput,
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
  onCreateSubsystem: (dto: CreateSubsystemInput) => void | Promise<void>;
  onCreateMenu: (dto: CreateMenuInput) => void | Promise<void>;
  onUpdateMenu: (id: string, dto: UpdateMenuInput) => void | Promise<void>;
  onUpdateSubsystem: (key: string, dto: UpdateSubsystemInput) => void | Promise<void>;
  onDeleteMenu: (id: string) => void | Promise<void>;
  onSetMenuVisibility: (id: string, visible: boolean) => void | Promise<void>;
}

type FormState =
  | { mode: 'create'; parentId: string | null; type: ManagedMenuType }
  | { mode: 'edit'; menu: MenuRecord }
  | null;

type SubsystemFormState = { mode: 'create' } | { mode: 'edit'; subsystem: Subsystem } | null;
type ActiveSubsystemFormState = Exclude<SubsystemFormState, null>;

interface SubsystemDraft {
  key: string;
  name: string;
  desc: string;
  icon: string;
  enabled: boolean;
}

const DEFAULT_SUBSYSTEM_ICON = 'layout-grid';
const DEFAULT_SUBSYSTEM_COLOR = 'var(--accent-emphasis)';
const DEFAULT_SUBSYSTEM_HOME = '/admin/dashboard';
const subsystemKeyPattern = /^[a-z][a-z0-9-]*$/;

const subsystemIconOptions = [
  { value: 'layout-grid', labelKey: 'menus.iconOptions.default' },
  { value: 'folder', labelKey: 'menus.iconOptions.folder' },
  { value: 'settings', labelKey: 'menus.iconOptions.settings' },
  { value: 'chart', labelKey: 'menus.iconOptions.chart' },
  { value: 'users', labelKey: 'menus.iconOptions.users' },
  { value: 'shield', labelKey: 'menus.iconOptions.shield' },
  { value: 'menu', labelKey: 'menus.iconOptions.menu' },
  { value: 'list', labelKey: 'menus.iconOptions.list' },
] satisfies { value: string; labelKey: string }[];

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

function subsystemDraft(state: ActiveSubsystemFormState, locale: string): SubsystemDraft {
  if (state.mode === 'create') {
    return {
      key: '',
      name: '',
      desc: '',
      icon: DEFAULT_SUBSYSTEM_ICON,
      enabled: true,
    };
  }

  return {
    key: state.subsystem.key,
    name: subsystemLabel(state.subsystem, locale),
    desc: lv(state.subsystem.desc, locale),
    icon: state.subsystem.icon,
    enabled: state.subsystem.enabled,
  };
}

function localizedDraft(value: string) {
  return { 'zh-CN': value.trim() };
}

function nextSubsystemSort(subsystems: Subsystem[]) {
  return Math.max(0, ...subsystems.map((subsystem) => subsystem.sort)) + 1;
}

function SubsystemFormDialog({
  open,
  state,
  subsystems,
  locale,
  t,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  state: ActiveSubsystemFormState;
  subsystems: Subsystem[];
  locale: string;
  t: TFunction<'admin'>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    payload:
      | { mode: 'create'; dto: CreateSubsystemInput }
      | { mode: 'edit'; key: string; dto: UpdateSubsystemInput },
  ) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<SubsystemDraft>(() => subsystemDraft(state, locale));
  const [error, setError] = useState('');
  const iconOptions: SelectOption[] = subsystemIconOptions.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));
  const creating = state.mode === 'create';
  const patchDraft = (patch: Partial<SubsystemDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const submit = async () => {
    const key = draft.key.trim();
    const name = draft.name.trim();
    const desc = draft.desc.trim();
    if (creating && !key) {
      setError(t('menus.subsystemForm.errors.keyRequired'));
      return;
    }
    if (creating && !subsystemKeyPattern.test(key)) {
      setError(t('menus.subsystemForm.errors.keyInvalid'));
      return;
    }
    if (creating && subsystems.some((subsystem) => subsystem.key === key)) {
      setError(t('menus.subsystemForm.errors.keyDuplicated'));
      return;
    }
    if (!name) {
      setError(t('menus.subsystemForm.errors.nameRequired'));
      return;
    }
    if (!desc) {
      setError(t('menus.subsystemForm.errors.descRequired'));
      return;
    }

    if (creating) {
      await onSubmit({
        mode: 'create',
        dto: {
          key,
          label: localizedDraft(name),
          desc: localizedDraft(desc),
          icon: draft.icon,
          color: DEFAULT_SUBSYSTEM_COLOR,
          home: DEFAULT_SUBSYSTEM_HOME,
          builtin: false,
          enabled: draft.enabled,
          sort: nextSubsystemSort(subsystems),
        },
      });
      return;
    }

    await onSubmit({
      mode: 'edit',
      key: state.subsystem.key,
      dto: {
        label: localizedDraft(name),
        desc: localizedDraft(desc),
        icon: draft.icon,
        color: state.subsystem.color,
        home: state.subsystem.home,
        enabled: draft.enabled,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[calc(520px*var(--app-scale))]">
        <DialogHeader>
          <DialogTitle>
            {creating ? t('menus.dialog.createSubsystemTitle') : t('menus.dialog.editSubsystemTitle')}
          </DialogTitle>
        </DialogHeader>

        <FieldGroup>
          {error && <div className="rounded-8 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}
          {creating && (
            <Field>
              <FieldLabel htmlFor="subsystem-key" required>
                {t('menus.subsystemForm.key')}
              </FieldLabel>
              <Input
                id="subsystem-key"
                aria-label={t('menus.subsystemForm.key')}
                value={draft.key}
                placeholder={t('menus.subsystemForm.keyPlaceholder')}
                onChange={(event) => patchDraft({ key: event.currentTarget.value })}
              />
              <FieldDescription>{t('menus.subsystemForm.keyHint')}</FieldDescription>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="subsystem-name" required>
              {t('menus.subsystemForm.name')}
            </FieldLabel>
            <Input
              id="subsystem-name"
              aria-label={t('menus.subsystemForm.name')}
              value={draft.name}
              placeholder={t('menus.subsystemForm.namePlaceholder')}
              onChange={(event) => patchDraft({ name: event.currentTarget.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="subsystem-desc" required>
              {t('menus.subsystemForm.desc')}
            </FieldLabel>
            <Input
              id="subsystem-desc"
              aria-label={t('menus.subsystemForm.desc')}
              value={draft.desc}
              placeholder={t('menus.subsystemForm.descPlaceholder')}
              onChange={(event) => patchDraft({ desc: event.currentTarget.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="subsystem-icon">{t('menus.subsystemForm.icon')}</FieldLabel>
            <SelectControl
              id="subsystem-icon"
              value={draft.icon}
              options={iconOptions}
              onValueChange={(icon) => patchDraft({ icon })}
            />
          </Field>
          <Field>
            <div className="flex items-center justify-between gap-4 rounded-8 border border-(--table-border) px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-text">{t('menus.subsystemForm.enabled')}</div>
                <FieldDescription>{t('menus.subsystemForm.enabledHint')}</FieldDescription>
              </div>
              <Switch
                aria-label={t('menus.subsystemForm.enabled')}
                checked={draft.enabled}
                onCheckedChange={(enabled) => patchDraft({ enabled })}
              />
            </div>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('menus.actions.cancel')}
          </Button>
          <Button onClick={submit}>{t('menus.actions.saveSubsystem')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const invalidateSubsystems = async () => {
    await queryClient.invalidateQueries({ queryKey: ['nav', 'subsystems'] });
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
  const createSubsystem = useMutation({
    mutationFn: menuApi.createSubsystem,
    onSuccess: async (subsystem) => {
      setActiveSubsystemKey(subsystem.key);
      await Promise.all([invalidateSubsystems(), invalidateMenus()]);
      toast.success(t('menus.toast.subsystemCreated'));
    },
    onError: (error) => toast.error(errorMessage(error, t('menus.toast.failed'))),
  });
  const updateSubsystem = useMutation({
    mutationFn: ({ key, dto }: { key: string; dto: UpdateSubsystemInput }) => menuApi.updateSubsystem(key, dto),
    onSuccess: async () => {
      await Promise.all([invalidateSubsystems(), invalidateMenus()]);
      toast.success(t('menus.toast.subsystemUpdated'));
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
      onCreateSubsystem={async (dto: CreateSubsystemInput) => {
        await createSubsystem.mutateAsync(dto);
      }}
      onCreateMenu={async (dto: CreateMenuInput) => {
        await createMenu.mutateAsync(dto);
      }}
      onUpdateMenu={async (id: string, dto: UpdateMenuInput) => {
        await updateMenu.mutateAsync({ id, dto });
      }}
      onUpdateSubsystem={async (key: string, dto: UpdateSubsystemInput) => {
        await updateSubsystem.mutateAsync({ key, dto });
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
  onCreateSubsystem,
  onCreateMenu,
  onUpdateMenu,
  onUpdateSubsystem,
  onDeleteMenu,
  onSetMenuVisibility,
}: MenusViewProps) {
  const { t, i18n } = useTranslation('admin');
  const locale = i18n.language;
  const [keyword, setKeyword] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const [formState, setFormState] = useState<FormState>(null);
  const [subsystemFormState, setSubsystemFormState] = useState<SubsystemFormState>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuRecord | null>(null);
  const activeSubsystem = subsystems.find((subsystem) => subsystem.key === activeSubsystemKey) ?? subsystems[0];
  const activeKey = activeSubsystem?.key ?? activeSubsystemKey;
  const stats = useMemo(() => countMenuStats(menus), [menus]);
  const rows = useMemo(
    () => buildManagedMenuRows(menus, collapsedIds, locale, keyword),
    [collapsedIds, keyword, locale, menus],
  );
  const allCollapsibleIds = useMemo(() => collapsibleMenuIds(menus), [menus]);
  const allMenusCollapsed =
    allCollapsibleIds.length > 0 && allCollapsibleIds.every((id) => collapsedIds.includes(id));
  const canCreate = matchPermission(permissions, 'iam:menu:create');
  const canUpdate = matchPermission(permissions, 'iam:menu:update');
  const canDelete = matchPermission(permissions, 'iam:menu:del');
  const canToggle = matchPermission(permissions, 'iam:menu:toggle');
  const activeSubsystemName = subsystemLabel(activeSubsystem, locale);

  const toggleCollapse = (id: string) => {
    setCollapsedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };
  const toggleAllCollapsed = () => {
    setCollapsedIds(allMenusCollapsed ? [] : allCollapsibleIds);
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
  const submitSubsystem = async (
    payload:
      | { mode: 'create'; dto: CreateSubsystemInput }
      | { mode: 'edit'; key: string; dto: UpdateSubsystemInput },
  ) => {
    if (payload.mode === 'create') {
      await onCreateSubsystem(payload.dto);
    } else {
      await onUpdateSubsystem(payload.key, payload.dto);
    }
    setSubsystemFormState(null);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeleteMenu(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <PageFrame breadcrumbs={[{ label: t('menus.breadcrumbGroup') }, { label: t('menus.title') }]}>
      <PageSurface data-testid="menu-management-surface" className="min-h-[calc(100dvh-138px)]">
        <div className="flex min-h-0 flex-1">
          <aside
            aria-label={t('menus.subsystems.listLabel')}
            className="flex min-h-0 w-[calc(300px*var(--app-scale))] shrink-0 flex-col border-r border-(--page-pane-divider) bg-(--side-list-bg) px-3 py-4"
          >
            <div className="mb-4 flex items-start gap-3 px-1">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-10 bg-(--nav-item-bg-current) text-(--nav-item-fg-current)">
                <Grid2X2 className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-text">{t('menus.subsystems.title')}</h1>
                <p className="mt-1 text-xs leading-5 text-text-3">{t('menus.subsystems.desc')}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {subsystems.map((subsystem) => {
                const active = subsystem.key === activeKey;
                const label = subsystemLabel(subsystem, locale);
                return (
                  <div
                    key={subsystem.key}
                    className={cn(
                      'group relative rounded-10 border transition-colors',
                      active
                        ? 'border-(--nav-item-border-current) bg-(--nav-item-bg-current) shadow-(--nav-item-shadow-current)'
                        : 'border-transparent bg-transparent hover:bg-(--side-list-item-bg-hover)',
                    )}
                  >
                    <button
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      aria-label={t('menus.actions.selectSubsystem', { name: label })}
                      className="flex min-h-[calc(94px*var(--app-scale))] w-full items-start gap-3 rounded-10 px-3 py-3 pr-10 text-left"
                      onClick={() => onActiveSubsystemChange(subsystem.key)}
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-8',
                          active
                            ? 'bg-(--pro-panel-bg) text-(--nav-item-fg-current)'
                            : 'bg-(--nav-item-bg-current) text-(--nav-item-fg-current)',
                        )}
                      >
                        <Icon name={subsystem.icon} className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-sm font-semibold', active ? 'text-(--nav-item-fg-current)' : 'text-text')}>
                          {label}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-text-3">
                          {lv(subsystem.desc, locale)}
                        </span>
                        <span className="mt-2 flex items-center gap-2 text-xs text-text-3">
                          <span>{subsystem.builtin ? t('menus.subsystems.builtin') : t('menus.subsystems.custom')}</span>
                          <span>·</span>
                          <span>{subsystem.enabled ? t('menus.subsystems.enabled') : t('menus.subsystems.disabled')}</span>
                        </span>
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-2 opacity-70 hover:opacity-100"
                      aria-label={t('menus.actions.editSubsystem', { name: label })}
                      title={t('menus.actions.edit')}
                      onClick={() => setSubsystemFormState({ mode: 'edit', subsystem })}
                    >
                      <Edit3 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {canCreate && (
              <Button
                type="button"
                variant="dashed"
                className="mt-3 h-10"
                block
                onClick={() => setSubsystemFormState({ mode: 'create' })}
              >
                <Plus data-icon="inline-start" />
                {t('menus.actions.createSubsystem')}
              </Button>
            )}
          </aside>

          <section
            aria-label={t('menus.treeRegionLabel', { subsystem: activeSubsystemName })}
            className="flex min-w-0 flex-1 flex-col border-l border-(--page-section-divider) px-7 py-[calc(22px*var(--app-scale))]"
          >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-text">
                  {t('menus.treeTitle', { subsystem: activeSubsystemName })}
                </span>
                {refreshing && <span className="text-xs text-text-3">{t('menus.refreshing')}</span>}
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
            <SearchField
              aria-label={t('menus.searchLabel')}
              value={keyword}
              placeholder={t('menus.searchPlaceholder')}
              containerClassName="w-[calc(280px*var(--app-scale))]"
              onChange={(event) => setKeyword(event.currentTarget.value)}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={allCollapsibleIds.length === 0}
              onClick={toggleAllCollapsed}
            >
              {allMenusCollapsed ? (
                <ChevronsDown data-icon="inline-start" />
              ) : (
                <ChevronsUp data-icon="inline-start" />
              )}
              {t(allMenusCollapsed ? 'menus.actions.expand' : 'menus.actions.collapse')}
            </Button>
            {canCreate && (
              <Button size="sm" onClick={() => setFormState({ mode: 'create', parentId: null, type: 'dir' })}>
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
          </section>
        </div>
      </PageSurface>

      {subsystemFormState && (
        <SubsystemFormDialog
          key={subsystemFormState.mode === 'create' ? 'create' : subsystemFormState.subsystem.key}
          open
          state={subsystemFormState}
          subsystems={subsystems}
          locale={locale}
          t={t}
          onOpenChange={(open) => {
            if (!open) setSubsystemFormState(null);
          }}
          onSubmit={submitSubsystem}
        />
      )}

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
    </PageFrame>
  );
}
