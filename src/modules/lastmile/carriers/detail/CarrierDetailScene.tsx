import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { PageFrame, PageTabs, type PageTabItem } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { carrierDetailQuery } from '../api';
import type { CarrierDetailTab } from '../types';
export function CarrierDetailScene({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useTranslation('lastmile');
  const [tab, setTab] = useState<CarrierDetailTab>('basic');
  const result = useQuery(carrierDetailQuery(id));
  const carrier = result.data;
  if (!carrier)
    return (
      <PageFrame breadcrumbs={[{ label: t('carriers.title') }, { label: t('carriers.detailTitle') }]}>
        <QueryState
          data={carrier}
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
  const tabValues: CarrierDetailTab[] = ['basic', 'services', 'channels'];
  const tabs: PageTabItem<CarrierDetailTab>[] = tabValues.map((value) => ({
    value,
    label: t(`carriers.tabs.${value}`),
  }));
  return (
    <PageFrame breadcrumbs={[{ label: t('carriers.title') }, { label: t('carriers.detailTitle') }]}>
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="ui-page-title text-xl font-semibold">{carrier.name}</h1>
              <StatusBadge tone={carrier.enabled ? 'success' : 'neutral'}>
                {t(carrier.enabled ? 'common.enabled' : 'common.disabled')}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-text-3">
              {carrier.fullName} · {carrier.region}
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="outline" onClick={onBack}>
            {t('common.back')}
          </Button>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader className="border-b border-border">
          <PageTabs value={tab} items={tabs} onValueChange={setTab} />
        </CardHeader>
        <CardContent className="p-5">
          {tab === 'basic' && (
            <DescriptionList
              items={[
                { label: t('carriers.fields.name'), value: carrier.name },
                { label: t('carriers.fields.fullName'), value: carrier.fullName },
                { label: t('carriers.fields.region'), value: carrier.region },
                {
                  label: t('common.status'),
                  value: t(carrier.enabled ? 'common.enabled' : 'common.disabled'),
                },
              ]}
            />
          )}
          {tab === 'services' &&
            carrier.services.map((service) => (
              <div key={service.id} className="grid grid-cols-4 gap-3 border-b border-border py-3 text-sm">
                <strong>{service.name}</strong>
                <span>{service.code}</span>
                <span>{t(service.tracking ? 'common.trackingSupported' : 'common.trackingUnsupported')}</span>
                <span>{service.labelFormat}</span>
              </div>
            ))}
          {tab === 'channels' &&
            carrier.channels.map((channel) => (
              <div key={channel.id} className="grid grid-cols-4 gap-3 border-b border-border py-3 text-sm">
                <strong>{channel.name}</strong>
                <span>{channel.code}</span>
                <span>{channel.supplier}</span>
                <StatusBadge tone={channel.enabled ? 'success' : 'neutral'}>
                  {t(channel.enabled ? 'common.enabled' : 'common.disabled')}
                </StatusBadge>
              </div>
            ))}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
