import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { DetailHeader, PageFrame, PageTabs, type PageTabItem } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { supplierDetailQuery } from '../api';
import type { SupplierDetailTab } from '../types';
export function SupplierDetailScene({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useTranslation('lastmile');
  const [tab, setTab] = useState<SupplierDetailTab>('basic');
  const result = useQuery(supplierDetailQuery(id));
  const supplier = result.data;
  if (!supplier)
    return (
      <PageFrame breadcrumbs={[{ label: t('suppliers.title') }, { label: t('suppliers.detailTitle') }]}>
        <QueryState
          data={supplier}
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
  const tabValues: SupplierDetailTab[] = ['basic', 'credentials', 'mapping', 'channels'];
  const tabs: PageTabItem<SupplierDetailTab>[] = tabValues.map((value) => ({
    value,
    label: t(`suppliers.tabs.${value}`),
  }));
  return (
    <PageFrame breadcrumbs={[{ label: t('suppliers.title') }, { label: t('suppliers.detailTitle') }]}>
      <DetailHeader
        title={supplier.name}
        subtitle={`${supplier.code} · ${supplier.type}`}
        status={
          <StatusBadge tone={supplier.enabled ? 'success' : 'neutral'}>
            {t(supplier.enabled ? 'common.enabled' : 'common.disabled')}
          </StatusBadge>
        }
        actions={
          <Button variant="outline" onClick={onBack}>
            {t('common.back')}
          </Button>
        }
      />
      <Card spacing="compact">
        <CardHeader className="border-b border-border">
          <PageTabs value={tab} items={tabs} onValueChange={setTab} />
        </CardHeader>
        <CardContent>
          {tab === 'basic' && (
            <DescriptionList
              columns={3}
              items={[
                { label: t('suppliers.fields.name'), value: supplier.name },
                { label: t('suppliers.fields.type'), value: supplier.type },
                { label: t('suppliers.fields.carriers'), value: supplier.carriers.join(' · ') },
                { label: t('suppliers.fields.settlement'), value: supplier.settlement },
                {
                  label: t('common.status'),
                  value: t(supplier.enabled ? 'common.enabled' : 'common.disabled'),
                },
              ]}
            />
          )}
          {tab === 'credentials' && (
            <DescriptionList
              columns={3}
              items={[
                { label: t('suppliers.fields.account'), value: supplier.credentialLabel },
                { label: 'Base URL', value: supplier.baseUrl },
                { label: 'Auth Type', value: supplier.authType },
                { label: 'API Secret', value: '••••••••••••' },
                {
                  label: t('suppliers.credentials.connection'),
                  value: t(supplier.enabled ? 'common.normal' : 'common.disabled'),
                },
                { label: t('suppliers.credentials.latency'), value: `${supplier.latency} ms` },
              ]}
            />
          )}
          {tab === 'mapping' &&
            supplier.mappings.map((row) => (
              <div key={row.id} className="grid grid-cols-4 gap-3 border-b border-border py-3 text-sm">
                <strong>{row.carrier}</strong>
                <span>{row.product}</span>
                <span>{row.services}</span>
                <span>{t(row.tracking ? 'common.trackingSupported' : 'common.trackingUnsupported')}</span>
              </div>
            ))}
          {tab === 'channels' &&
            supplier.channels.map((row) => (
              <div key={row.id} className="grid grid-cols-4 gap-3 border-b border-border py-3 text-sm">
                <strong>{row.name}</strong>
                <span>{row.code}</span>
                <span>{row.carrier}</span>
                <StatusBadge tone={row.enabled ? 'success' : 'neutral'}>
                  {t(row.enabled ? 'common.enabled' : 'common.disabled')}
                </StatusBadge>
              </div>
            ))}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
