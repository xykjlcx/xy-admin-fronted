import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package, Printer, Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@/components/pro/DescriptionList';
import { PageFrame, PageTabs, type PageTabItem } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { shipmentDetailQuery, type ShipmentDto } from '../api';
import { money, shipmentTone } from '../model';
import type { ShipmentDetailTab } from '../types';

export function ShipmentDetailScene({
  id,
  onBack,
  onPrint,
  onTrack,
}: {
  id: string;
  onBack: () => void;
  onPrint: () => void;
  onTrack: () => void;
}) {
  const { t } = useTranslation('lastmile');
  const [tab, setTab] = useState<ShipmentDetailTab>('basic');
  const result = useQuery(shipmentDetailQuery(id));
  const shipment = result.data;
  const tabValues: ShipmentDetailTab[] = ['basic', 'parcel', 'fee', 'track'];
  const tabs: PageTabItem<ShipmentDetailTab>[] = tabValues.map((value) => ({
    value,
    label: t(`shipments.tabs.${value}`),
  }));
  if (!shipment)
    return (
      <PageFrame breadcrumbs={[{ label: t('common.subsystem') }, { label: t('shipments.detailTitle') }]}>
        <QueryState
          data={shipment}
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
  return (
    <PageFrame breadcrumbs={[{ label: t('shipments.title') }, { label: t('shipments.detailTitle') }]}>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="ui-page-title text-xl font-semibold">{shipment.no}</h1>
              <StatusBadge tone={shipmentTone[shipment.status]}>
                {t(`shipments.status.${shipment.status}`)}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-text-3">
              {shipment.customer} · {shipment.country} · {shipment.createdAt}
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="outline" onClick={onBack}>
            {t('common.back')}
          </Button>
          <Button variant="outline" onClick={onTrack}>
            <Route data-icon="inline-start" />
            {t('shipments.track')}
          </Button>
          <Button onClick={onPrint}>
            <Printer data-icon="inline-start" />
            {t('shipments.printLabel')}
          </Button>
        </CardContent>
      </Card>
      <div className="my-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [t('shipments.columns.channel'), shipment.channel],
          [t('shipments.columns.tracking'), shipment.trackingNo],
          [t('shipments.columns.weight'), `${shipment.weight.toFixed(2)} kg`],
          [t('shipments.columns.fee'), money(shipment.fee)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-text-3">{label}</p>
              <p className="mt-2 font-semibold text-text">{value}</p>
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
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <h2 className="font-semibold">{t('shipments.sender')}</h2>
                <DescriptionList
                  items={[
                    { label: t('shipments.fields.customer'), value: shipment.sender.name },
                    { label: t('shipments.fields.phone'), value: shipment.sender.phone },
                    { label: t('shipments.fields.warehouse'), value: shipment.warehouse },
                    { label: t('shipments.fields.address'), value: shipment.sender.address },
                  ]}
                />
              </section>
              <section>
                <h2 className="font-semibold">{t('shipments.receiver')}</h2>
                <DescriptionList
                  items={[
                    { label: t('shipments.fields.recipient'), value: shipment.receiver.name },
                    { label: t('shipments.fields.phone'), value: shipment.receiver.phone },
                    { label: t('shipments.fields.country'), value: shipment.receiver.country },
                    { label: t('shipments.fields.postalCode'), value: shipment.receiver.postalCode },
                    { label: t('shipments.fields.address'), value: shipment.receiver.address },
                  ]}
                />
              </section>
            </div>
          )}
          {tab === 'parcel' && (
            <div className="grid gap-3">
              {shipment.parcels.map((parcel) => (
                <Card key={parcel.id}>
                  <CardContent className="flex flex-wrap items-center gap-4 p-4">
                    <Package className="size-5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {parcel.name} × {parcel.quantity}
                      </p>
                      <p className="mt-1 text-xs text-text-3">
                        HS {parcel.hsCode} · {parcel.weight} kg · {parcel.size}
                      </p>
                    </div>
                    <strong>{money(parcel.declaredValue)}</strong>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {tab === 'fee' && (
            <div className="max-w-[calc(520px*var(--app-scale))]">
              {shipment.feeItems.map((item) => (
                <div key={item.label} className="flex justify-between border-b border-border py-3 text-sm">
                  <span className="text-text-2">{item.label}</span>
                  <span>{money(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-4 font-semibold">
                <span>{t('shipments.columns.fee')}</span>
                <span>{money(shipment.fee)}</span>
              </div>
            </div>
          )}
          {tab === 'track' && <TrackingTimeline shipment={shipment} />}
        </CardContent>
      </Card>
    </PageFrame>
  );
}

export function TrackingTimeline({ shipment }: { shipment: ShipmentDto }) {
  return (
    <ol className="grid gap-5">
      {shipment.tracking.map((node) => (
        <li key={node.id} className="flex gap-3">
          <span
            className={
              node.completed
                ? 'mt-1 size-3 shrink-0 rounded-full bg-(--accent-emphasis)'
                : 'mt-1 size-3 shrink-0 rounded-full bg-surface-3'
            }
          />
          <div>
            <p className={node.current ? 'font-semibold text-text' : 'text-sm text-text-2'}>{node.title}</p>
            <p className="mt-1 text-xs text-text-3">
              {node.place} · {node.occurredAt}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
