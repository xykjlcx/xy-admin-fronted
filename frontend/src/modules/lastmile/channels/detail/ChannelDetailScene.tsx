import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { matchPermission } from '@/lib/permission';
import { toast } from 'sonner';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { PageFrame, PageTabs, type PageTabItem } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { channelApi, channelDetailQuery, channelKeys } from '../api';
import { channelKindTone, money } from '../model';
import type { ChannelDetailTab } from '../types';
export function ChannelDetailScene({
  id,
  permissions,
  systemAdmin = false,
  onBack,
  onEdit,
}: {
  id: string;
  permissions: string[];
  systemAdmin?: boolean;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation('lastmile');
  const { t: tCommon } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ChannelDetailTab>('basic');
  const result = useQuery(channelDetailQuery(id));
  const channel = result.data;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: channelKeys.all });
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => channelApi.toggle(id, enabled),
    onSuccess: async () => {
      await invalidate();
      toast.success(t('channels.toast.toggled'));
    },
  });
  const test = useMutation({
    mutationFn: () => channelApi.test(id),
    onSuccess: (result) => toast.success(t('channels.toast.tested', { latency: result.latency })),
  });
  if (!channel)
    return (
      <PageFrame breadcrumbs={[{ label: t('channels.title') }, { label: t('channels.detailTitle') }]}>
        <QueryState
          data={channel}
          pending={result.isPending}
          error={result.isError}
          loadingLabel={t('common.loading')}
          errorLabel={tCommon('errors.refetchFailed')}
          retryLabel={tCommon('errors.retry')}
          onRetry={() => void result.refetch()}
        >
          {() => null}
        </QueryState>
      </PageFrame>
    );
  const tabValues: ChannelDetailTab[] = ['basic', 'api', 'region', 'quote', 'logs'];
  const tabs: PageTabItem<ChannelDetailTab>[] = tabValues.map((value) => ({
    value,
    label: t(`channels.tabs.${value}`),
  }));
  return (
    <PageFrame breadcrumbs={[{ label: t('channels.title') }, { label: t('channels.detailTitle') }]}>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="ui-page-title text-xl font-semibold">{channel.name}</h1>
              <StatusBadge tone={channelKindTone[channel.kind]}>
                {t(`channels.kind.${channel.kind}`)}
              </StatusBadge>
              <StatusBadge tone={channel.enabled ? 'success' : 'neutral'}>
                {t(channel.enabled ? 'common.enabled' : 'common.disabled')}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-text-3">
              {channel.code} · {channel.supplier} · {channel.carrier}
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="outline" onClick={onBack}>
            {t('common.back')}
          </Button>
          <Button
            variant="outline"
            onClick={onEdit}
            disabled={!matchPermission({ permissions, systemAdmin }, 'lastmile:channel:update')}
          >
            {t('common.edit')}
          </Button>
          <Button variant="outline" loading={test.isPending} onClick={() => test.mutate()}>
            {t('channels.test')}
          </Button>
          <Button
            variant={channel.enabled ? 'destructive' : 'primary'}
            loading={toggle.isPending}
            onClick={() => toggle.mutate(!channel.enabled)}
          >
            {t(channel.enabled ? 'common.disabled' : 'common.enabled')}
          </Button>
        </CardContent>
      </Card>
      <div className="my-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          [t('channels.summary.sevenDays'), '8,462'],
          [t('channels.summary.successRate'), '99.28%'],
          [t('channels.summary.countries'), String(channel.countries.length)],
          [t('channels.summary.lastSync'), channel.updatedAt],
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
                { label: t('channels.fields.name'), value: channel.name },
                { label: t('channels.fields.code'), value: channel.code },
                { label: t('channels.fields.supplier'), value: channel.supplier },
                { label: t('channels.fields.carrier'), value: channel.carrier },
                { label: t('channels.fields.service'), value: channel.service },
                { label: t('channels.fields.countries'), value: channel.countries.join(' · ') },
                { label: t('channels.columns.cost'), value: money(channel.cost) },
                { label: t('channels.columns.sell'), value: money(channel.price) },
              ]}
            />
          )}{' '}
          {tab === 'api' && (
            <DescriptionList
              items={[
                { label: 'Base URL', value: channel.api.baseUrl },
                { label: t('channels.api.productCode'), value: channel.api.productCode },
                { label: 'Account No.', value: channel.api.accountNo },
                { label: 'Label Format', value: channel.api.labelFormat },
                {
                  label: t('channels.api.tracking'),
                  value: t(channel.api.tracking ? 'common.configured' : 'common.notConfigured'),
                },
                { label: t('channels.api.latency'), value: `${channel.api.latency} ms` },
              ]}
            />
          )}{' '}
          {tab === 'region' && (
            <div className="grid gap-2">
              {channel.regions.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[1.4fr_1.3fr_1fr_1fr_80px] gap-3 border-b border-border py-3 text-sm"
                >
                  <strong>{row.group}</strong>
                  <span>{row.postalRange}</span>
                  <span>{row.weightRange}</span>
                  <span>{row.transitTime}</span>
                  <StatusBadge tone={row.enabled ? 'success' : 'neutral'}>
                    {t(row.enabled ? 'common.enabled' : 'common.disabled')}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}{' '}
          {tab === 'quote' && (
            <div className="grid gap-2">
              {channel.quotes.map((row) => (
                <div key={row.id} className="grid grid-cols-7 gap-3 border-b border-border py-3 text-sm">
                  <strong>{row.country}</strong>
                  <span>{row.weightRange}</span>
                  <span>{money(row.cost)}</span>
                  <strong>{money(row.price)}</strong>
                  <span>{money(row.fuel)}</span>
                  <span>{money(row.remote)}</span>
                  <span>{row.effectiveAt}</span>
                </div>
              ))}
            </div>
          )}{' '}
          {tab === 'logs' && (
            <div className="grid gap-2">
              {channel.logs.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[170px_90px_120px_1fr_1fr] gap-3 border-b border-border py-3 text-sm"
                >
                  <span>{row.occurredAt}</span>
                  <span>{row.operator}</span>
                  <span>{row.type}</span>
                  <span>{row.change}</span>
                  <span>{row.note}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
