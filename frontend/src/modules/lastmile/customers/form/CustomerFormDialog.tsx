import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CreateCustomerSchema, type CreateCustomerInput } from '../api';

export function CustomerFormDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateCustomerInput) => void;
  submitting: boolean;
}) {
  const { t } = useTranslation('lastmile');
  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(CreateCustomerSchema),
    defaultValues: { name: '', code: '', type: '跨境卖家', contact: '', phone: '', email: '', credit: 5000 },
  });
  const field = (name: keyof CreateCustomerInput, type = 'text') => (
    <Field>
      <FieldLabel htmlFor={`customer-${name}`} required>
        {t(`customers.fields.${name}`)}
      </FieldLabel>
      <Input
        id={`customer-${name}`}
        type={type}
        {...form.register(name, type === 'number' ? { valueAsNumber: true } : undefined)}
      />
      {form.formState.errors[name]?.message && (
        <FieldError>{form.formState.errors[name]?.message}</FieldError>
      )}
    </Field>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent
        title={t('customers.create')}
        cancelText={t('common.cancel')}
        submitText={t('common.save')}
        submitDisabled={submitting}
        onCancel={() => onOpenChange(false)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {field('name')}
          {field('code')}
          {field('type')}
          {field('contact')}
          {field('phone')}
          {field('email', 'email')}
          {field('credit', 'number')}
        </div>
      </FormDialogContent>
    </Dialog>
  );
}
