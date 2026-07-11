import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { CreateDictionaryInput, DictionaryDto, UpdateDictionaryInput } from '../api';

type DictionaryFormState = Pick<CreateDictionaryInput, 'name' | 'code' | 'remark'>;

export function DictionaryFormDialog({
  open,
  dictionary,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  dictionary?: DictionaryDto;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateDictionaryInput | UpdateDictionaryInput) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const editing = !!dictionary;
  const [form, setForm] = useState<DictionaryFormState>({
    name: dictionary?.name ?? '',
    code: dictionary?.code ?? '',
    remark: dictionary?.remark ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const valid = !!form.name.trim() && (editing || /^[a-z][a-z0-9_]*$/.test(form.code.trim()));
  const patch = (value: Partial<DictionaryFormState>) => setForm((current) => ({ ...current, ...value }));

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      if (editing) {
        await onSubmit({ name: form.name.trim(), remark: form.remark.trim() });
      } else {
        await onSubmit({
          name: form.name.trim(),
          code: form.code.trim(),
          remark: form.remark.trim(),
          builtin: false,
        });
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent
        title={t(editing ? 'dictionaries.form.editTitle' : 'dictionaries.form.createTitle')}
        cancelText={t('dictionaries.actions.cancel')}
        submitText={t(editing ? 'dictionaries.actions.save' : 'dictionaries.actions.createDictionary')}
        submitDisabled={!valid || submitting}
        onCancel={() => onOpenChange(false)}
        onSubmit={submit}
      >
        <Field>
          <FieldLabel htmlFor="dictionary-name" required>
            {t('dictionaries.form.name')}
          </FieldLabel>
          <Input
            id="dictionary-name"
            aria-label={t('dictionaries.form.name')}
            value={form.name}
            onChange={(event) => patch({ name: event.currentTarget.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dictionary-code" required>
            {t('dictionaries.form.code')}
          </FieldLabel>
          <Input
            id="dictionary-code"
            aria-label={t('dictionaries.form.code')}
            value={form.code}
            disabled={editing}
            onChange={(event) => patch({ code: event.currentTarget.value })}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dictionary-remark">{t('dictionaries.form.remark')}</FieldLabel>
          <Input
            id="dictionary-remark"
            aria-label={t('dictionaries.form.remark')}
            value={form.remark}
            onChange={(event) => patch({ remark: event.currentTarget.value })}
          />
        </Field>
      </FormDialogContent>
    </Dialog>
  );
}
