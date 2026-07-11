import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UpdateProfileSchema, type ProfileDto, type UpdateProfileInput } from '../api';

const inputFields = ['name', 'phone', 'location', 'title', 'language', 'timezone'] as const;

export function ProfileFormDialog({
  open,
  profile,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  profile: ProfileDto;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: UpdateProfileInput) => Promise<void> | void;
}) {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState<UpdateProfileInput>(() => UpdateProfileSchema.parse(profile));
  const [submitting, setSubmitting] = useState(false);
  const valid = UpdateProfileSchema.safeParse(form).success;
  const patch = (field: keyof UpdateProfileInput, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
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
        title={t('profile.form.title')}
        cancelText={t('profile.actions.cancel')}
        submitText={t('profile.actions.save')}
        submitDisabled={!valid || submitting}
        onCancel={() => onOpenChange(false)}
        onSubmit={submit}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {inputFields.map((field) => (
            <Field key={field}>
              <FieldLabel htmlFor={`profile-${field}`} required>
                {t(`profile.fields.${field}`)}
              </FieldLabel>
              <Input
                id={`profile-${field}`}
                aria-label={t(`profile.fields.${field}`)}
                value={form[field]}
                onChange={(event) => patch(field, event.currentTarget.value)}
              />
            </Field>
          ))}
        </div>
        <Field>
          <FieldLabel htmlFor="profile-bio" required>
            {t('profile.fields.bio')}
          </FieldLabel>
          <Textarea
            id="profile-bio"
            aria-label={t('profile.fields.bio')}
            value={form.bio}
            onChange={(event) => patch('bio', event.currentTarget.value)}
          />
        </Field>
      </FormDialogContent>
    </Dialog>
  );
}
