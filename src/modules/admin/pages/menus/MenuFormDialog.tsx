import { useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectControl, type SelectOption } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { lv } from '@/lib/localized';
import { nextSiblingSort } from './menu-management-model';
import type { ManagedMenuType, UpdateMenuInput } from '@/modules/admin/api/menu.api';
import type { MenuRecord } from '@/modules/types';

const routeOptions = [
  { value: '/admin/dashboard', labelKey: 'dashboard.navTitle' },
  { value: '/admin/users', labelKey: 'users.title' },
  { value: '/admin/roles', labelKey: 'roles.title' },
  { value: '/admin/menus', labelKey: 'menus.title' },
] satisfies { value: NonNullable<MenuRecord['path']>; labelKey: string }[];

const iconOptions = [
  { value: '', labelKey: 'menus.iconOptions.default' },
  { value: 'layout-dashboard', labelKey: 'menus.iconOptions.layoutDashboard' },
  { value: 'users', labelKey: 'menus.iconOptions.users' },
  { value: 'user', labelKey: 'menus.iconOptions.user' },
  { value: 'shield', labelKey: 'menus.iconOptions.shield' },
  { value: 'menu', labelKey: 'menus.iconOptions.menu' },
  { value: 'list', labelKey: 'menus.iconOptions.list' },
  { value: 'folder', labelKey: 'menus.iconOptions.folder' },
  { value: 'settings', labelKey: 'menus.iconOptions.settings' },
  { value: 'chart', labelKey: 'menus.iconOptions.chart' },
] satisfies { value: string; labelKey: string }[];

interface DraftState {
  type: ManagedMenuType;
  parentId: string;
  name: string;
  icon: string;
  shortLabel: string;
  path: string;
  permission: string;
  visible: boolean;
  sort: string;
}

export interface MenuFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  subsystemKey: string;
  menus: MenuRecord[];
  locale: string;
  t: TFunction<'admin'>;
  initialMenu?: MenuRecord | null;
  initialParentId?: string | null;
  initialType?: ManagedMenuType;
  onOpenChange: (open: boolean) => void;
  onSubmit: (dto: UpdateMenuInput) => void | Promise<void>;
}

function menuLabel(menu: MenuRecord, locale: string) {
  return lv(menu.label, locale);
}

function isDescendant(menuById: Map<string, MenuRecord>, candidateId: string, ancestorId: string): boolean {
  const candidate = menuById.get(candidateId);
  if (!candidate?.parentId) return false;
  if (candidate.parentId === ancestorId) return true;
  return isDescendant(menuById, candidate.parentId, ancestorId);
}

function parentOptions(
  type: ManagedMenuType,
  menus: MenuRecord[],
  locale: string,
  rootLabel: string,
  editingId?: string,
) {
  const rootOption = { id: '', label: rootLabel };
  if (type === 'dir') return [rootOption];
  const menuById = new Map(menus.map((menu) => [menu.id, menu]));

  const candidates = menus
    .filter((menu) => {
      if (menu.id === editingId) return false;
      if (editingId && isDescendant(menuById, menu.id, editingId)) return false;
      return type === 'menu' ? menu.type === 'dir' : menu.type === 'menu';
    })
    .sort((a, b) => a.sort - b.sort)
    .map((menu) => ({ id: menu.id, label: menuLabel(menu, locale) }));

  return type === 'menu' ? [rootOption, ...candidates] : candidates;
}

function buildInitialDraft({
  mode,
  subsystemKey,
  menus,
  locale,
  initialMenu,
  initialParentId,
  initialType,
}: Pick<
  MenuFormDialogProps,
  'mode' | 'subsystemKey' | 'menus' | 'locale' | 'initialMenu' | 'initialParentId' | 'initialType'
>): DraftState {
  if (mode === 'edit' && initialMenu) {
    return {
      type: initialMenu.type,
      parentId: initialMenu.parentId ?? '',
      name: menuLabel(initialMenu, locale),
      icon: initialMenu.icon ?? '',
      shortLabel: lv(initialMenu.shortLabel, locale),
      path: initialMenu.path ?? '',
      permission: initialMenu.permission ?? '',
      visible: initialMenu.visible,
      sort: String(initialMenu.sort),
    };
  }

  const type = initialType ?? 'dir';
  const parentId = initialParentId ?? null;
  return {
    type,
    parentId: parentId ?? '',
    name: '',
    icon: '',
    shortLabel: '',
    path: '',
    permission: '',
    visible: true,
    sort: String(nextSiblingSort(menus, subsystemKey, parentId)),
  };
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-text-2">
      {children}
    </label>
  );
}

function SelectField({
  id,
  value,
  disabled,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  disabled?: boolean;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <SelectControl
      id={id}
      value={value}
      disabled={disabled}
      options={options}
      placeholder={placeholder}
      onValueChange={onChange}
    />
  );
}

export function MenuFormDialog({
  open,
  mode,
  subsystemKey,
  menus,
  locale,
  t,
  initialMenu,
  initialParentId,
  initialType,
  onOpenChange,
  onSubmit,
}: MenuFormDialogProps) {
  const [draft, setDraft] = useState<DraftState>(() =>
    buildInitialDraft({ mode, subsystemKey, menus, locale, initialMenu, initialParentId, initialType }),
  );
  const [error, setError] = useState('');
  const editingId = initialMenu?.id;
  const typeLocked = !!initialMenu && menus.some((menu) => menu.parentId === initialMenu.id);
  const rootParentLabel = t('menus.form.rootParent');
  const currentParentOptions = useMemo(
    () => parentOptions(draft.type, menus, locale, rootParentLabel, editingId),
    [draft.type, editingId, locale, menus, rootParentLabel],
  );

  const patchDraft = (patch: Partial<DraftState>) => setDraft((current) => ({ ...current, ...patch }));
  const changeType = (type: ManagedMenuType) => {
    const options = parentOptions(type, menus, locale, rootParentLabel, editingId);
    const nextParent = type === 'dir' ? '' : options[0]?.id ?? '';
    const parentId = nextParent || null;
    setDraft((current) => ({
      ...current,
      type,
      parentId: nextParent,
      path: type === 'menu' ? current.path : '',
      permission: type === 'dir' ? '' : current.permission,
      sort: String(nextSiblingSort(menus, subsystemKey, parentId)),
    }));
  };
  const changeParent = (parentId: string) => {
    patchDraft({
      parentId,
      sort: String(nextSiblingSort(menus, subsystemKey, parentId || null)),
    });
  };
  const submit = async () => {
    const name = draft.name.trim();
    const permission = draft.permission.trim();
    if (!name) {
      setError(t('menus.form.errors.nameRequired'));
      return;
    }
    if (draft.type === 'menu' && !draft.path) {
      setError(t('menus.form.errors.pathRequired'));
      return;
    }
    if (draft.type === 'action' && !permission) {
      setError(t('menus.form.errors.permissionRequired'));
      return;
    }
    if (draft.type === 'action' && !draft.parentId) {
      setError(t('menus.form.errors.parentRequired'));
      return;
    }

    await onSubmit({
      parentId: draft.type === 'dir' ? null : draft.parentId || null,
      type: draft.type,
      label: { 'zh-CN': name },
      icon: draft.icon,
      shortLabel: draft.shortLabel.trim() ? { 'zh-CN': draft.shortLabel.trim() } : undefined,
      path: draft.type === 'menu' ? (draft.path as MenuRecord['path']) : undefined,
      permission: permission || undefined,
      visible: draft.visible,
      sort: Number(draft.sort) || nextSiblingSort(menus, subsystemKey, draft.parentId || null),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[calc(560px*var(--app-scale))]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? t('menus.dialog.createTitle') : t('menus.dialog.editTitle')}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {error && <div className="rounded-8 bg-danger-soft px-3 py-2 text-sm text-danger">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="menu-type">{t('menus.form.type')}</FieldLabel>
              <SelectField
                id="menu-type"
                value={draft.type}
                disabled={typeLocked}
                onChange={(value) => changeType(value as ManagedMenuType)}
                options={[
                  { value: 'dir', label: t('menus.types.dir') },
                  { value: 'menu', label: t('menus.types.menu') },
                  { value: 'action', label: t('menus.types.action') },
                ]}
              />
            </div>

            <div className="grid gap-2">
              <FieldLabel htmlFor="menu-parent">{t('menus.form.parent')}</FieldLabel>
              <SelectField
                id="menu-parent"
                value={draft.parentId}
                disabled={draft.type === 'dir' || currentParentOptions.length === 0}
                onChange={changeParent}
                options={currentParentOptions.map((option) => ({ value: option.id, label: option.label }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="menu-name">{t('menus.form.name')}</FieldLabel>
              <Input
                id="menu-name"
                value={draft.name}
                placeholder={t('menus.form.namePlaceholder')}
                onChange={(event) => patchDraft({ name: event.currentTarget.value })}
              />
            </div>

            <div className="grid gap-2">
              <FieldLabel htmlFor="menu-icon">{t('menus.form.icon')}</FieldLabel>
              <SelectField
                id="menu-icon"
                value={draft.icon}
                onChange={(value) => patchDraft({ icon: value })}
                options={iconOptions.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="menu-path">{t('menus.form.path')}</FieldLabel>
              <SelectField
                id="menu-path"
                value={draft.path}
                disabled={draft.type !== 'menu'}
                onChange={(value) => patchDraft({ path: value })}
                options={[
                  { value: '', label: t('menus.form.pathPlaceholder') },
                  ...routeOptions.map((option) => ({
                    value: option.value,
                    label: `${t(option.labelKey)} · ${option.value}`,
                  })),
                ]}
              />
            </div>

            <div className="grid gap-2">
              <FieldLabel htmlFor="menu-permission">{t('menus.form.permission')}</FieldLabel>
              <Input
                id="menu-permission"
                value={draft.permission}
                disabled={draft.type === 'dir'}
                placeholder={draft.type === 'action' ? 'iam:user:export' : 'iam:menu:view'}
                onChange={(event) => patchDraft({ permission: event.currentTarget.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_calc(112px*var(--app-scale))] gap-4">
            <div className="grid gap-2">
              <FieldLabel htmlFor="menu-short-label">{t('menus.form.shortLabel')}</FieldLabel>
              <Input
                id="menu-short-label"
                value={draft.shortLabel}
                disabled={draft.type === 'action'}
                placeholder={t('menus.form.shortLabelPlaceholder')}
                onChange={(event) => patchDraft({ shortLabel: event.currentTarget.value })}
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="menu-sort">{t('menus.form.sort')}</FieldLabel>
              <Input
                id="menu-sort"
                inputMode="numeric"
                value={draft.sort}
                onChange={(event) => patchDraft({ sort: event.currentTarget.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-8 border border-border px-3 py-2">
            <div>
              <div className="text-sm font-medium text-text">{t('menus.form.visible')}</div>
              <div className="text-xs text-text-3">{t('menus.form.visibleHint')}</div>
            </div>
            <Switch
              aria-label={t('menus.form.visible')}
              checked={draft.visible}
              className="data-[state=checked]:bg-success"
              onCheckedChange={(visible) => patchDraft({ visible })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('menus.actions.cancel')}
          </Button>
          <Button
            onClick={() => {
              void submit();
            }}
          >
            {mode === 'create' ? t('menus.actions.confirmCreate') : t('menus.actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
