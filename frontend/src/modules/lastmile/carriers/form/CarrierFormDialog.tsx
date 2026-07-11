import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { FormDialogContent } from '@/components/pro/FormDialog';
import { Dialog } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CarrierInputSchema, type CarrierInput } from '../api';
export function CarrierFormDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CarrierInput) => void;
  submitting: boolean;
}) {
  const { t } = useTranslation('lastmile');
  const form = useForm<CarrierInput>({
    resolver: zodResolver(CarrierInputSchema),
    defaultValues: { code: '', name: '', fullName: '', region: '欧洲', serviceName: '', serviceCode: '' },
  });
  const field = (name: keyof CarrierInput, label: string) => (
    <Field>
      <FieldLabel htmlFor={`carrier-${name}`} required>
        {label}
      </FieldLabel>
      <Input id={`carrier-${name}`} {...form.register(name)} />
      {form.formState.errors[name]?.message && (
        <FieldError>{form.formState.errors[name]?.message}</FieldError>
      )}
    </Field>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent
        title={t('carriers.create')}
        cancelText={t('common.cancel')}
        submitText={t('common.save')}
        submitDisabled={submitting}
        onCancel={() => onOpenChange(false)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {field('name', t('carriers.fields.name'))}
        {field('code', t('carriers.fields.code'))}
        {field('fullName', t('carriers.fields.fullName'))}
        {field('region', t('carriers.fields.region'))}
        {field('serviceName', t('carriers.fields.services'))}
        {field('serviceCode', t('carriers.fields.serviceCode'))}
      </FormDialogContent>
    </Dialog>
  );
}
