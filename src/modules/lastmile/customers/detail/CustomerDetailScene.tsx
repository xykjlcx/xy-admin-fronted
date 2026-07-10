import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { PageFrame, PageTabs, type PageTabItem } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { customerApi, customerDetailQuery, customerKeys } from '../api';
import { customerTone, money } from '../model';
import type { CustomerDetailTab } from '../types';

export function CustomerDetailScene({
  id,
  permissions,
  onBack,
}: {
  id: string;
  permissions: string[];
  onBack: () => void;
}) {
  const { t } = useTranslation('lastmile');
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<CustomerDetailTab>('basic');
  const result = useQuery(customerDetailQuery(id));
  const customer = result.data;
  const authorize = useMutation({
    mutationFn: ({ channelId, authorized }: { channelId: string; authorized: boolean }) =>
      customerApi.authorize(id, channelId, authorized),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) });
      toast.success(t('customers.toast.authorized'));
    },
  });
  if (!customer)
    return (
      <PageFrame breadcrumbs={[{ label: t('customers.title') }, { label: t('customers.detailTitle') }]}>
        <QueryState
          data={customer}
          pending={result.isPending}
          error={result.isError}
          loadingLabel={t('common.loading')}
          errorLabel={t('common.loadFailed')}
          retryLabel={t('common.retry')}
          onRetry={() => void result.refetch()}
        >
          {() => null}
        </QueryState>
      </PageFrame>
    );
  const tabValues: CustomerDetailTab[] = ['basic', 'authorization', 'pricing', 'flow'];
  const tabs: PageTabItem<CustomerDetailTab>[] = tabValues.map((value) => ({
    value,
    label: t(`customers.tabs.${value}`),
  }));
  const usage = customer.credit
    ? Math.round(((customer.credit - Math.max(customer.balance, 0)) / customer.credit) * 100)
    : 0;
  return (
    <PageFrame breadcrumbs={[{ label: t('customers.title') }, { label: t('customers.detailTitle') }]}>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="ui-page-title text-xl font-semibold">{customer.name}</h1>
              <StatusBadge tone={customerTone[customer.status]}>
                {t(`customers.status.${customer.status}`)}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-text-3">
              {customer.code} · {customer.type}
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="outline" onClick={onBack}>
            {t('common.back')}
          </Button>
        </CardContent>
      </Card>
      <div className="my-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [t('customers.summary.balance'), money(customer.balance)],
          [t('customers.summary.credit'), money(customer.credit)],
          [t('customers.summary.usage'), `${usage}%`],
          [t('customers.summary.pricing'), customer.pricingPlan],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-text-3">{label}</p>
              <p className="mt-2 text-lg font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="border-b border-border">
          <PageTabs value={tab} items={tabs} onValueChange={setTab} />
        </CardHeader>
        <CardContent className="p-5">
          {tab === 'basic' && (
            <DescriptionList
              items={[
                { label: t('customers.fields.name'), value: customer.name },
                { label: t('customers.fields.code'), value: customer.code },
                { label: t('customers.fields.type'), value: customer.type },
                { label: t('customers.fields.contact'), value: customer.contact },
                { label: t('customers.fields.phone'), value: customer.phone },
                { label: t('customers.fields.email'), value: customer.email },
              ]}
            />
          )}
          {tab === 'authorization' && (
            <div className="grid gap-2">
              {customer.channels.map((channel) => (
                <div key={channel.id} className="flex items-center gap-3 border-b border-border py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{channel.name}</p>
                    <p className="mt-1 text-xs text-text-3">
                      {channel.code} · {channel.carrier}
                    </p>
                  </div>
                  <Switch
                    aria-label={t('customers.authorizationAria', { name: channel.name })}
                    checked={channel.authorized}
                    disabled={
                      !permissions.includes('*:*:*') && !permissions.includes('lastmile:customer:authorize')
                    }
                    onCheckedChange={(authorized) => authorize.mutate({ channelId: channel.id, authorized })}
                  />
                </div>
              ))}
            </div>
          )}
          {tab === 'pricing' && (
            <div className="grid gap-2">
              {customer.priceRows.map((row) => (
                <div
                  key={`${row.channel}-${row.weightRange}`}
                  className="grid grid-cols-5 gap-3 border-b border-border py-3 text-sm"
                >
                  <strong>{row.channel}</strong>
                  <span>{row.weightRange}</span>
                  <span>{money(row.base)}</span>
                  <span>+{row.markup}%</span>
                  <strong>{money(row.final)}</strong>
                </div>
              ))}
            </div>
          )}
          {tab === 'flow' && (
            <div className="grid gap-2">
              {customer.transactions.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[160px_1fr_120px_120px] gap-3 border-b border-border py-3 text-sm"
                >
                  <span>{row.occurredAt}</span>
                  <span>{row.description}</span>
                  <strong>{money(row.amount)}</strong>
                  <span>{money(row.balance)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
