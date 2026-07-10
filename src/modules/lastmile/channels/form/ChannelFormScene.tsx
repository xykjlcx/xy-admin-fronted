import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageFrame } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import {
  ChannelInputSchema,
  ChannelDraftSchema,
  ChannelTestResultSchema,
  channelApi,
  channelDetailQuery,
  channelKeys,
  channelOptionsQuery,
  type ChannelInput,
} from '../api';
const defaults: ChannelInput = {
  name: '',
  code: '',
  kind: 'express',
  supplierId: '',
  carrierId: '',
  service: '',
  countries: ['DE'],
  accountOwner: 'platform',
  settlement: '月结',
  priority: 10,
  baseUrl: 'https://api.example.com',
  apiKey: 'mock-api-key',
  labelFormat: 'PDF',
  timeout: 30,
};
const channelDraftStorageKey = 'lastmile:channels:new-draft';

function loadChannelDraft(): ChannelInput {
  if (typeof window === 'undefined') return defaults;
  const raw = localStorage.getItem(channelDraftStorageKey);
  if (!raw) return defaults;
  try {
    const parsed = ChannelDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? { ...defaults, ...parsed.data } : defaults;
  } catch {
    return defaults;
  }
}
export function ChannelFormScene({
  id,
  onBack,
  onSaved,
}: {
  id?: string;
  onBack: () => void;
  onSaved: (id: string) => void;
}) {
  const { t } = useTranslation('lastmile');
  const queryClient = useQueryClient();
  const optionsResult = useQuery(channelOptionsQuery);
  const detailResult = useQuery({ ...channelDetailQuery(id ?? 'new'), enabled: Boolean(id) });
  const options = optionsResult.data;
  const detail = detailResult.data;
  const form = useForm<ChannelInput>({
    resolver: zodResolver(ChannelInputSchema),
    defaultValues: id ? defaults : loadChannelDraft(),
  });
  useEffect(() => {
    if (detail)
      form.reset({
        name: detail.name,
        code: detail.code,
        kind: detail.kind,
        supplierId: detail.supplierId,
        carrierId: detail.carrierId,
        service: detail.service,
        countries: detail.countries,
        accountOwner: detail.accountOwner,
        settlement: detail.settlement,
        priority: detail.priority,
        baseUrl: detail.api.baseUrl,
        apiKey: 'mock-api-key',
        labelFormat: detail.api.labelFormat,
        timeout: 30,
      });
  }, [detail, form]);
  const supplierId = useWatch({ control: form.control, name: 'supplierId' });
  const carrierId = useWatch({ control: form.control, name: 'carrierId' });
  const supplier = options?.suppliers.find((item) => item.value === supplierId);
  const carrier = supplier?.carriers.find((item) => item.value === carrierId);
  const save = useMutation({
    mutationFn: (input: ChannelInput) => (id ? channelApi.update(id, input) : channelApi.create(input)),
    onSuccess: async (channel) => {
      await queryClient.invalidateQueries({ queryKey: channelKeys.all });
      if (!id) localStorage.removeItem(channelDraftStorageKey);
      toast.success(t(id ? 'channels.toast.updated' : 'channels.toast.created'));
      onSaved(channel.id);
    },
  });
  const saveDraft = () => {
    localStorage.setItem(channelDraftStorageKey, JSON.stringify(form.getValues()));
    toast.success(t('channels.toast.drafted'));
  };
  const test = useMutation({
    mutationFn: () =>
      id
        ? channelApi.test(id)
        : Promise.resolve(
            ChannelTestResultSchema.parse({ ok: true, latency: 286, testedAt: new Date().toISOString() }),
          ),
    onSuccess: (result) => toast.success(t('channels.toast.tested', { latency: result.latency })),
  });
  const title = t(id ? 'channels.editTitle' : 'channels.newTitle');
  if (!options)
    return (
      <PageFrame breadcrumbs={[{ label: t('channels.title') }, { label: title }]}>
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
  if (id && !detail)
    return (
      <PageFrame breadcrumbs={[{ label: t('channels.title') }, { label: title }]}>
        <QueryState
          data={detail}
          pending={detailResult.isPending}
          error={detailResult.isError}
          loadingLabel={t('common.loading')}
          errorLabel={t('common.loadFailed')}
          retryLabel={t('common.retry')}
          onRetry={() => void detailResult.refetch()}
        >
          {() => null}
        </QueryState>
      </PageFrame>
    );
  const select = (
    name: 'kind' | 'supplierId' | 'carrierId' | 'service' | 'accountOwner' | 'settlement' | 'labelFormat',
    label: string,
    values: { value: string; label: string }[],
    disabled = false,
  ) => (
    <Field>
      <FieldLabel required>{label}</FieldLabel>
      <Controller
        name={name}
        control={form.control}
        render={({ field }) => (
          <SelectControl
            value={field.value}
            options={values}
            disabled={disabled}
            aria-label={label}
            onValueChange={(value) => {
              field.onChange(value);
              if (name === 'supplierId') {
                form.setValue('carrierId', '');
                form.setValue('service', '');
              }
              if (name === 'carrierId') form.setValue('service', '');
            }}
          />
        )}
      />
      {form.formState.errors[name]?.message && (
        <FieldError>{form.formState.errors[name]?.message}</FieldError>
      )}
    </Field>
  );
  const text = (
    name: 'name' | 'code' | 'baseUrl' | 'apiKey' | 'priority' | 'timeout',
    label: string,
    type = 'text',
  ) => (
    <Field>
      <FieldLabel htmlFor={`channel-${name}`} required>
        {label}
      </FieldLabel>
      <Input
        id={`channel-${name}`}
        type={type}
        {...form.register(name, type === 'number' ? { valueAsNumber: true } : undefined)}
      />
      {form.formState.errors[name]?.message && (
        <FieldError>{form.formState.errors[name]?.message}</FieldError>
      )}
    </Field>
  );
  return (
    <PageFrame breadcrumbs={[{ label: t('channels.title') }, { label: title }]}>
      <div className="mb-4">
        <h1 className="ui-page-title text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-text-3">{t('channels.description')}</p>
      </div>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('channels.sections.basic')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {text('name', t('channels.fields.name'))}
            {text('code', t('channels.fields.code'))}
            {select(
              'kind',
              t('channels.fields.kind'),
              ['express', 'line', 'postal', 'self'].map((value) => ({
                value,
                label: t(`channels.kind.${value}`),
              })),
            )}
            {select(
              'supplierId',
              t('channels.fields.supplier'),
              options?.suppliers.map(({ value, label }) => ({ value, label })) ?? [],
            )}
            {select(
              'carrierId',
              t('channels.fields.carrier'),
              supplier?.carriers.map(({ value, label }) => ({ value, label })) ?? [],
              !supplier,
            )}
            {select(
              'service',
              t('channels.fields.service'),
              carrier?.services.map((value) => ({ value, label: value })) ?? [],
              !carrier,
            )}
            {select('accountOwner', t('channels.fields.account'), [
              { value: 'platform', label: t('channels.account.platform') },
              { value: 'enterprise', label: t('channels.account.enterprise') },
              { value: 'self', label: t('channels.account.self') },
            ])}
            {select('settlement', t('channels.fields.settlement'), [
              { value: '月结', label: t('channels.settlement.monthly') },
              { value: '预付', label: t('channels.settlement.prepaid') },
            ])}
            {text('priority', t('channels.fields.priority'), 'number')}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('channels.sections.api')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {text('baseUrl', t('channels.fields.baseUrl'))}
            {text('apiKey', t('channels.fields.apiKey'), 'password')}
            {select('labelFormat', t('channels.fields.labelFormat'), [
              { value: 'PDF', label: 'PDF' },
              { value: 'ZPL', label: 'ZPL' },
            ])}
            {text('timeout', t('channels.fields.timeout'), 'number')}
            <div className="flex items-end">
              <Button type="button" variant="outline" loading={test.isPending} onClick={() => test.mutate()}>
                {t('channels.test')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-5 flex justify-center gap-3">
        <Button variant="outline" onClick={onBack}>
          {t('common.cancel')}
        </Button>
        <Button variant="outline" onClick={saveDraft}>
          {t('channels.saveDraft')}
        </Button>
        <Button loading={save.isPending} onClick={form.handleSubmit((input) => save.mutate(input))}>
          {title}
        </Button>
      </div>
    </PageFrame>
  );
}
