import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { UpdateCompanySchema, type CompanyDto, type UpdateCompanyInput } from '../api';

const editableFields = [
  'name',
  'domain',
  'industry',
  'scale',
  'dataResidency',
  'contactName',
  'contactEmail',
  'contactPhone',
  'landline',
  'address',
  'postalCode',
] as const;

export function CompanyFormDialog({
  open,
  company,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  company: CompanyDto;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: UpdateCompanyInput) => void | Promise<void>;
}) {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState<UpdateCompanyInput>(() => UpdateCompanySchema.parse(company));
  const [submitting, setSubmitting] = useState(false);
  const valid = UpdateCompanySchema.safeParse(form).success;
  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent
        title={t('company.form.title')}
        cancelText={t('company.actions.cancel')}
        submitText={t('company.actions.save')}
        submitDisabled={!valid || submitting}
        onCancel={() => onOpenChange(false)}
        onSubmit={submit}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {editableFields.map((field) => (
            <Field key={field} className={field === 'address' ? 'sm:col-span-2' : undefined}>
              <FieldLabel htmlFor={`company-${field}`} required={field !== 'landline'}>
                {t(`company.fields.${field}`)}
              </FieldLabel>
              <Input
                id={`company-${field}`}
                aria-label={t(`company.fields.${field}`)}
                value={form[field]}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setForm((current) => ({ ...current, [field]: value }));
                }}
              />
            </Field>
          ))}
        </div>
      </FormDialogContent>
    </Dialog>
  );
}
