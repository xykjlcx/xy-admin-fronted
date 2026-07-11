import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ChangePasswordSchema, type ChangePasswordInput } from '../api';

export function PasswordFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ChangePasswordInput) => Promise<void> | void;
}) {
  const { t } = useTranslation('admin');
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const valid = ChangePasswordSchema.safeParse(form).success && form.newPassword === form.confirmPassword;
  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      onOpenChange(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('profile.password.failed'));
    } finally {
      setSubmitting(false);
    }
  };
  const field = (key: keyof typeof form) => (
    <Field>
      <FieldLabel htmlFor={`password-${key}`} required>
        {t(`profile.password.${key}`)}
      </FieldLabel>
      <Input
        role="textbox"
        id={`password-${key}`}
        type="password"
        aria-label={t(`profile.password.${key}`)}
        value={form[key]}
        onChange={(event) => {
          const value = event.currentTarget.value;
          setForm((current) => ({ ...current, [key]: value }));
        }}
      />
    </Field>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent
        title={t('profile.password.title')}
        description={t('profile.password.hint')}
        cancelText={t('profile.actions.cancel')}
        submitText={t('profile.password.submit')}
        submitDisabled={!valid || submitting}
        onCancel={() => onOpenChange(false)}
        onSubmit={submit}
      >
        {field('currentPassword')}
        {field('newPassword')}
        {field('confirmPassword')}
        {error && <FieldError role="alert">{error}</FieldError>}
      </FormDialogContent>
    </Dialog>
  );
}
