import { Controller } from 'react-hook-form';
import type { TFunction } from 'i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl, type SelectOption } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { lv } from '@/lib/localized';
import { menuRouteOptions } from '../model';
import { subsystemFormValuesToPayload, useSubsystemForm } from './useSubsystemForm';
import type { CreateSubsystemInput, UpdateSubsystemInput } from '../api';
import type { SubsystemFormState } from '../types';
import type { Subsystem } from '@/modules/types';

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

interface SubsystemFormDialogProps {
  state: SubsystemFormState;
  subsystems: Subsystem[];
  locale: string;
  t: TFunction<'admin'>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    payload:
      | { mode: 'create'; dto: CreateSubsystemInput }
      | { mode: 'edit'; key: string; dto: UpdateSubsystemInput },
  ) => void | Promise<void>;
}

export function SubsystemFormDialog(props: SubsystemFormDialogProps) {
  const dialogKey = props.state.mode === 'create' ? 'create' : `edit-${props.state.subsystem.key}`;

  return (
    <Dialog open onOpenChange={props.onOpenChange}>
      <SubsystemFormDialogContent key={dialogKey} {...props} />
    </Dialog>
  );
}

function SubsystemFormDialogContent({
  state,
  subsystems,
  locale,
  t,
  onOpenChange,
  onSubmit,
}: SubsystemFormDialogProps) {
  const form = useSubsystemForm({ state, subsystems, locale });
  const { control, formState, handleSubmit, register } = form;
  const creating = state.mode === 'create';
  const iconOptions: SelectOption[] = subsystemIconOptions.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  }));
  const homeOptions: SelectOption[] = [
    { value: '', label: t('menus.subsystemForm.homePlaceholder') },
    ...menuRouteOptions.map((option) => ({
      value: option.value,
      label: `${lv(option.label, locale)} · ${option.value}`,
    })),
  ];
  const submit = handleSubmit(async (values) => {
    await onSubmit(subsystemFormValuesToPayload(values, state, subsystems, locale));
  });

  return (
    <FormDialogContent
      title={creating ? t('menus.dialog.createSubsystemTitle') : t('menus.dialog.editSubsystemTitle')}
      size="md"
      cancelText={t('menus.actions.cancel')}
      submitText={t('menus.actions.saveSubsystem')}
      submitDisabled={!formState.isValid}
      submitLoading={formState.isSubmitting}
      onCancel={() => onOpenChange(false)}
      onSubmit={() => {
        void submit();
      }}
    >
      {creating && (
        <Field data-invalid={!!formState.errors.key}>
          <FieldLabel htmlFor="subsystem-key" required>
            {t('menus.subsystemForm.key')}
          </FieldLabel>
          <Input
            id="subsystem-key"
            aria-label={t('menus.subsystemForm.key')}
            placeholder={t('menus.subsystemForm.keyPlaceholder')}
            aria-invalid={!!formState.errors.key}
            {...register('key')}
          />
          <FieldDescription>{t('menus.subsystemForm.keyHint')}</FieldDescription>
          {formState.errors.key && (
            <FieldError>
              {t(
                formState.errors.key.message === 'keyDuplicated'
                  ? 'menus.subsystemForm.errors.keyDuplicated'
                  : 'menus.subsystemForm.errors.keyInvalid',
              )}
            </FieldError>
          )}
        </Field>
      )}

      <Field data-invalid={!!formState.errors.name}>
        <FieldLabel htmlFor="subsystem-name" required>
          {t('menus.subsystemForm.name')}
        </FieldLabel>
        <Input
          id="subsystem-name"
          aria-label={t('menus.subsystemForm.name')}
          placeholder={t('menus.subsystemForm.namePlaceholder')}
          aria-invalid={!!formState.errors.name}
          {...register('name')}
        />
        {formState.errors.name && <FieldError>{t('menus.subsystemForm.errors.nameRequired')}</FieldError>}
      </Field>

      <Field data-invalid={!!formState.errors.desc}>
        <FieldLabel htmlFor="subsystem-desc" required>
          {t('menus.subsystemForm.desc')}
        </FieldLabel>
        <Input
          id="subsystem-desc"
          aria-label={t('menus.subsystemForm.desc')}
          placeholder={t('menus.subsystemForm.descPlaceholder')}
          aria-invalid={!!formState.errors.desc}
          {...register('desc')}
        />
        {formState.errors.desc && <FieldError>{t('menus.subsystemForm.errors.descRequired')}</FieldError>}
      </Field>

      <Field>
        <FieldLabel htmlFor="subsystem-icon">{t('menus.subsystemForm.icon')}</FieldLabel>
        <Controller
          name="icon"
          control={control}
          render={({ field }) => (
            <SelectControl
              id="subsystem-icon"
              aria-label={t('menus.subsystemForm.icon')}
              value={field.value}
              options={iconOptions}
              onValueChange={field.onChange}
            />
          )}
        />
      </Field>

      <Field data-invalid={!!formState.errors.home}>
        <FieldLabel htmlFor="subsystem-home" required>
          {t('menus.subsystemForm.home')}
        </FieldLabel>
        <Controller
          name="home"
          control={control}
          render={({ field }) => (
            <SelectControl
              id="subsystem-home"
              aria-label={t('menus.subsystemForm.home')}
              value={field.value}
              options={homeOptions}
              aria-invalid={!!formState.errors.home}
              onValueChange={field.onChange}
            />
          )}
        />
        {formState.errors.home && <FieldError>{t('menus.subsystemForm.errors.homeRequired')}</FieldError>}
      </Field>

      <Field>
        <FieldLabel htmlFor="subsystem-enabled">{t('menus.subsystemForm.enabled')}</FieldLabel>
        <FieldDescription>{t('menus.subsystemForm.enabledHint')}</FieldDescription>
        <Controller
          name="enabled"
          control={control}
          render={({ field }) => (
            <Switch
              id="subsystem-enabled"
              aria-label={t('menus.subsystemForm.enabled')}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </Field>
    </FormDialogContent>
  );
}
