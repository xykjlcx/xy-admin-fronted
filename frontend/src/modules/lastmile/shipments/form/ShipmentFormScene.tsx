import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageFrame } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import {
  CreateShipmentSchema,
  shipmentApi,
  shipmentKeys,
  shipmentOptionsQuery,
  type CreateShipmentInput,
} from '../api';

const emptyParcel = { name: '', hsCode: '', quantity: 1, weight: 0.1, size: '10×10×10', declaredValue: 0 };

export function ShipmentFormScene({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (id: string, print: boolean) => void;
}) {
  const { t } = useTranslation('lastmile');
  const queryClient = useQueryClient();
  const optionsResult = useQuery(shipmentOptionsQuery);
  const options = optionsResult.data;
  const form = useForm<CreateShipmentInput>({
    resolver: zodResolver(CreateShipmentSchema),
    defaultValues: {
      customerId: '',
      warehouse: '深圳坂田保税仓',
      recipient: '',
      phone: '',
      country: '',
      postalCode: '',
      address: '',
      channelId: 'ch-002',
      services: ['签名服务'],
      parcels: [
        {
          ...emptyParcel,
          name: '蓝牙耳机',
          hsCode: '8518300000',
          quantity: 2,
          weight: 0.3,
          declaredValue: 39,
        },
      ],
    },
  });
  const parcels = useFieldArray({ control: form.control, name: 'parcels' });
  const create = useMutation({
    mutationFn: shipmentApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      toast.success(t('shipments.toast.created'));
    },
  });
  const submit = (print: boolean) =>
    form.handleSubmit((input) =>
      create.mutate(input, { onSuccess: (shipment) => onCreated(shipment.id, print) }),
    )();
  if (!options)
    return (
      <PageFrame breadcrumbs={[{ label: t('shipments.title') }, { label: t('shipments.newTitle') }]}>
        <QueryState
          data={options}
          pending={optionsResult.isPending}
          error={optionsResult.isError}
          loadingLabel={t('common.loading')}
          errorLabel={t('common.loadFailed')}
          retryLabel={t('common.retry')}
          onRetry={() => void optionsResult.refetch()}
        >
          {() => null}
        </QueryState>
      </PageFrame>
    );
  return (
    <PageFrame breadcrumbs={[{ label: t('shipments.title') }, { label: t('shipments.newTitle') }]}>
      <div className="mb-4">
        <h1 className="ui-page-title text-xl font-semibold">{t('shipments.newTitle')}</h1>
        <p className="mt-1 text-sm text-text-3">{t('shipments.newDescription')}</p>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_calc(320px*var(--app-scale))]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('shipments.sender')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <SelectField
                name="customerId"
                label={t('shipments.fields.customer')}
                control={form.control}
                options={options?.customers ?? []}
                error={form.formState.errors.customerId?.message}
              />
              <SelectField
                name="warehouse"
                label={t('shipments.fields.warehouse')}
                control={form.control}
                options={options?.warehouses ?? []}
                error={form.formState.errors.warehouse?.message}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('shipments.receiver')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                name="recipient"
                label={t('shipments.fields.recipient')}
                register={form.register}
                error={form.formState.errors.recipient?.message}
              />
              <TextField
                name="phone"
                label={t('shipments.fields.phone')}
                register={form.register}
                error={form.formState.errors.phone?.message}
              />
              <SelectField
                name="country"
                label={t('shipments.fields.country')}
                control={form.control}
                options={options?.countries ?? []}
                error={form.formState.errors.country?.message}
              />
              <TextField
                name="postalCode"
                label={t('shipments.fields.postalCode')}
                register={form.register}
                error={form.formState.errors.postalCode?.message}
              />
              <div className="md:col-span-2">
                <TextField
                  name="address"
                  label={t('shipments.fields.address')}
                  register={form.register}
                  error={form.formState.errors.address?.message}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('shipments.parcel')}</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => parcels.append(emptyParcel)}>
                <Plus data-icon="inline-start" />
                {t('shipments.addParcel')}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              {parcels.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid items-end gap-3 rounded-10 border border-border px-3 py-2.5 md:grid-cols-[1.3fr_1fr_80px_100px_110px_110px_auto]"
                >
                  <TextField
                    name={`parcels.${index}.name`}
                    label={t('shipments.fields.parcelName')}
                    register={form.register}
                  />
                  <TextField
                    name={`parcels.${index}.hsCode`}
                    label={t('shipments.fields.hsCode')}
                    register={form.register}
                  />
                  <TextField
                    name={`parcels.${index}.quantity`}
                    label={t('shipments.fields.quantity')}
                    type="number"
                    register={form.register}
                    valueAsNumber
                  />
                  <TextField
                    name={`parcels.${index}.weight`}
                    label={t('shipments.fields.weightKg')}
                    type="number"
                    register={form.register}
                    valueAsNumber
                  />
                  <TextField
                    name={`parcels.${index}.declaredValue`}
                    label={t('shipments.fields.declaredValue')}
                    type="number"
                    register={form.register}
                    valueAsNumber
                  />
                  <TextField
                    name={`parcels.${index}.size`}
                    label={t('shipments.fields.sizeCm')}
                    register={form.register}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('shipments.removeParcel')}
                    disabled={parcels.fields.length === 1}
                    onClick={() => parcels.remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('shipments.channel')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <SelectField
                name="channelId"
                label={t('shipments.fields.channel')}
                control={form.control}
                options={options?.channels ?? []}
                error={form.formState.errors.channelId?.message}
              />
              <Controller
                name="services"
                control={form.control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value.includes('保险')}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked ? [...field.value, '保险'] : field.value.filter((item) => item !== '保险'),
                        )
                      }
                    />
                    {t('shipments.insurance')}
                  </label>
                )}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('shipments.estimate')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span>{t('shipments.baseFee')}</span>
                <span>¥47.00</span>
              </div>
              <div className="flex justify-between">
                <span>{t('shipments.fuelFee')}</span>
                <span>¥6.00</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>{t('shipments.totalFee')}</span>
                <span>¥56.00</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div className="mt-5 flex justify-center gap-3">
        <Button variant="outline" onClick={onBack}>
          {t('common.cancel')}
        </Button>
        <Button variant="outline" loading={create.isPending} onClick={() => submit(false)}>
          {t('shipments.saveOnly')}
        </Button>
        <Button loading={create.isPending} onClick={() => submit(true)}>
          {t('shipments.saveAndPrint')}
        </Button>
      </div>
    </PageFrame>
  );
}

type TextName = Parameters<ReturnType<typeof useForm<CreateShipmentInput>>['register']>[0];
function TextField({
  name,
  label,
  register,
  error,
  type = 'text',
  valueAsNumber = false,
}: {
  name: TextName;
  label: string;
  register: ReturnType<typeof useForm<CreateShipmentInput>>['register'];
  error?: string;
  type?: string;
  valueAsNumber?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={`shipment-${name}`} required>
        {label}
      </FieldLabel>
      <Input
        id={`shipment-${name}`}
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        aria-invalid={Boolean(error)}
        {...register(name, { valueAsNumber })}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

function SelectField({
  name,
  label,
  control,
  options,
  error,
}: {
  name: 'customerId' | 'warehouse' | 'country' | 'channelId';
  label: string;
  control: ReturnType<typeof useForm<CreateShipmentInput>>['control'];
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <Field>
      <FieldLabel required>{label}</FieldLabel>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <SelectControl
            value={field.value}
            options={options}
            placeholder={label}
            aria-label={label}
            aria-invalid={Boolean(error)}
            onValueChange={field.onChange}
          />
        )}
      />
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
