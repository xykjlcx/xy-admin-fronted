import { Controller, type UseFormReturn } from 'react-hook-form';
import type { TFunction } from 'i18next';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl, type SelectOption } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { lv } from '@/lib/localized';
import { menuRouteOptions } from '../model';
import type { MenuFormValues } from './useMenuForm';

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

interface MenuFormFieldsProps {
  form: UseFormReturn<MenuFormValues>;
  locale: string;
  t: TFunction<'admin'>;
  typeLocked: boolean;
  contextLocked: boolean;
  parentOptions: SelectOption[];
  onTypeChange: (value: string) => void;
  onParentChange: (value: string) => void;
}

export function MenuFormFields({
  form,
  locale,
  t,
  typeLocked,
  contextLocked,
  parentOptions,
  onTypeChange,
  onParentChange,
}: MenuFormFieldsProps) {
  const { control, formState, register, watch } = form;
  const type = watch('type');
  const parentId = watch('parentId');

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field data-invalid={!!formState.errors.type}>
          <FieldLabel htmlFor="menu-type">{t('menus.form.type')}</FieldLabel>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <SelectControl
                id="menu-type"
                value={field.value}
                disabled={typeLocked}
                aria-invalid={!!formState.errors.type}
                options={[
                  { value: 'dir', label: t('menus.types.dir') },
                  { value: 'menu', label: t('menus.types.menu') },
                  { value: 'action', label: t('menus.types.action') },
                ]}
                onValueChange={onTypeChange}
              />
            )}
          />
        </Field>

        <Field data-invalid={!!formState.errors.parentId}>
          <FieldLabel htmlFor="menu-parent">{t('menus.form.parent')}</FieldLabel>
          <SelectControl
            id="menu-parent"
            value={parentId}
            disabled={contextLocked || type === 'dir' || parentOptions.length === 0}
            aria-invalid={!!formState.errors.parentId}
            options={parentOptions}
            onValueChange={onParentChange}
          />
          {formState.errors.parentId && <FieldError>{t('menus.form.errors.parentRequired')}</FieldError>}
        </Field>

        <Field data-invalid={!!formState.errors.name}>
          <FieldLabel htmlFor="menu-name" required>{t('menus.form.name')}</FieldLabel>
          <Input
            id="menu-name"
            aria-label={t('menus.form.name')}
            placeholder={t('menus.form.namePlaceholder')}
            aria-invalid={!!formState.errors.name}
            {...register('name')}
          />
          {formState.errors.name && <FieldError>{t('menus.form.errors.nameRequired')}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="menu-icon">{t('menus.form.icon')}</FieldLabel>
          <Controller
            name="icon"
            control={control}
            render={({ field }) => (
              <SelectControl
                id="menu-icon"
                aria-label={t('menus.form.icon')}
                value={field.value}
                options={iconOptions.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
                onValueChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field data-invalid={!!formState.errors.path}>
          <FieldLabel htmlFor="menu-path">{t('menus.form.path')}</FieldLabel>
          <Controller
            name="path"
            control={control}
            render={({ field }) => (
              <SelectControl
                id="menu-path"
                aria-label={t('menus.form.path')}
                value={field.value}
                disabled={type !== 'menu'}
                aria-invalid={!!formState.errors.path}
                options={[
                  { value: '', label: t('menus.form.pathPlaceholder') },
                  ...menuRouteOptions.map((option) => ({
                    value: option.value,
                    label: `${lv(option.label, locale)} · ${option.value}`,
                  })),
                ]}
                onValueChange={field.onChange}
              />
            )}
          />
          {formState.errors.path && <FieldError>{t('menus.form.errors.pathRequired')}</FieldError>}
        </Field>

        <Field data-invalid={!!formState.errors.permission}>
          <FieldLabel htmlFor="menu-permission">{t('menus.form.permission')}</FieldLabel>
          <Input
            id="menu-permission"
            aria-label={t('menus.form.permission')}
            disabled={type === 'dir'}
            placeholder={type === 'action' ? 'iam:user:export' : 'iam:menu:view'}
            aria-invalid={!!formState.errors.permission}
            {...register('permission')}
          />
          {formState.errors.permission && <FieldError>{t('menus.form.errors.permissionRequired')}</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="menu-short-label">{t('menus.form.shortLabel')}</FieldLabel>
          <Input
            id="menu-short-label"
            aria-label={t('menus.form.shortLabel')}
            disabled={type === 'action'}
            placeholder={t('menus.form.shortLabelPlaceholder')}
            {...register('shortLabel')}
          />
        </Field>

        <Field data-invalid={!!formState.errors.sort}>
          <FieldLabel htmlFor="menu-sort">{t('menus.form.sort')}</FieldLabel>
          <Input id="menu-sort" aria-label={t('menus.form.sort')} inputMode="numeric" {...register('sort')} />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="menu-visible">{t('menus.form.visible')}</FieldLabel>
        <Controller
          name="visible"
          control={control}
          render={({ field }) => (
            <Switch
              id="menu-visible"
              aria-label={t('menus.form.visible')}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </Field>
    </>
  );
}
