import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DictionaryItemColorSchema, type CreateDictionaryItemInput, type DictionaryItemDto } from '../api';

export function DictionaryItemFormDialog({
  open,
  item,
  nextSort,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  item?: DictionaryItemDto;
  nextSort: number;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateDictionaryItemInput) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState<CreateDictionaryItemInput>({
    label: item?.label ?? '',
    value: item?.value ?? '',
    sort: item?.sort ?? nextSort,
    enabled: item?.enabled ?? true,
    color: item?.color ?? 'primary',
    remark: item?.remark ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const valid = !!form.label.trim() && !!form.value.trim() && Number.isInteger(form.sort);
  const patch = (value: Partial<CreateDictionaryItemInput>) =>
    setForm((current) => ({ ...current, ...value }));
  const colorOptions = (['primary', 'success', 'warning', 'danger', 'neutral'] as const).map((color) => ({
    value: color,
    label: t(`dictionaries.colors.${color}`),
  }));

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        label: form.label.trim(),
        value: form.value.trim(),
        remark: form.remark.trim(),
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent
        title={t(item ? 'dictionaries.itemForm.editTitle' : 'dictionaries.itemForm.createTitle')}
        cancelText={t('dictionaries.actions.cancel')}
        submitText={t('dictionaries.actions.saveItem')}
        submitDisabled={!valid || submitting}
        onCancel={() => onOpenChange(false)}
        onSubmit={submit}
      >
        <Field>
          <FieldLabel htmlFor="dictionary-item-label" required>
            {t('dictionaries.itemForm.label')}
          </FieldLabel>
          <Input
            id="dictionary-item-label"
            value={form.label}
            onChange={(event) => patch({ label: event.currentTarget.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dictionary-item-value" required>
            {t('dictionaries.itemForm.value')}
          </FieldLabel>
          <Input
            id="dictionary-item-value"
            value={form.value}
            onChange={(event) => patch({ value: event.currentTarget.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dictionary-item-sort">{t('dictionaries.itemForm.sort')}</FieldLabel>
          <Input
            id="dictionary-item-sort"
            inputMode="numeric"
            value={String(form.sort)}
            onChange={(event) => patch({ sort: Number.parseInt(event.currentTarget.value, 10) || 0 })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dictionary-item-color">{t('dictionaries.itemForm.color')}</FieldLabel>
          <SelectControl
            id="dictionary-item-color"
            value={form.color}
            options={colorOptions}
            onValueChange={(value) => {
              const color = DictionaryItemColorSchema.safeParse(value);
              if (color.success) patch({ color: color.data });
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dictionary-item-remark">{t('dictionaries.form.remark')}</FieldLabel>
          <Input
            id="dictionary-item-remark"
            value={form.remark}
            onChange={(event) => patch({ remark: event.currentTarget.value })}
          />
        </Field>
        <Field>
          <div className="flex items-center justify-between gap-4">
            <div>
              <FieldLabel htmlFor="dictionary-item-enabled">{t('dictionaries.itemForm.enabled')}</FieldLabel>
              <FieldDescription>{t('dictionaries.itemForm.enabledHint')}</FieldDescription>
            </div>
            <Switch
              id="dictionary-item-enabled"
              checked={form.enabled}
              onCheckedChange={(enabled) => patch({ enabled })}
            />
          </div>
        </Field>
      </FormDialogContent>
    </Dialog>
  );
}
