import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SupplierInputSchema, type SupplierInput } from '../api';
export function SupplierFormDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: SupplierInput) => void;
  submitting: boolean;
}) {
  const { t } = useTranslation('lastmile');
  const form = useForm<SupplierInput>({
    resolver: zodResolver(SupplierInputSchema),
    defaultValues: {
      code: '',
      name: '',
      type: '渠道聚合商',
      carriers: 'DHL',
      credentialLabel: '企业账号',
      baseUrl: 'https://api.example.com',
      settlement: '月结',
    },
  });
  const field = (name: keyof SupplierInput, label: string) => (
    <Field>
      <FieldLabel htmlFor={`supplier-${name}`} required>
        {label}
      </FieldLabel>
      <Input id={`supplier-${name}`} {...form.register(name)} />
      {form.formState.errors[name]?.message && (
        <FieldError>{form.formState.errors[name]?.message}</FieldError>
      )}
    </Field>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent
        title={t('suppliers.create')}
        cancelText={t('common.cancel')}
        submitText={t('common.save')}
        submitDisabled={submitting}
        onCancel={() => onOpenChange(false)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {field('name', t('suppliers.fields.name'))}
        {field('code', t('suppliers.fields.code'))}
        {field('type', t('suppliers.fields.type'))}
        {field('carriers', t('suppliers.fields.carriers'))}
        {field('credentialLabel', t('suppliers.fields.account'))}
        {field('baseUrl', 'Base URL')}
        {field('settlement', t('suppliers.fields.settlement'))}
      </FormDialogContent>
    </Dialog>
  );
}
