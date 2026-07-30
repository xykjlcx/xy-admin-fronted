import { useQuery } from '@tanstack/react-query';
import { Printer, Route } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DescriptionList } from '@/components/pro/DescriptionList';
import {
  DetailAside,
  DetailHeader,
  DetailMain,
  DetailSection,
  DetailTimeline,
  DetailWorkspace,
  PageFrame,
} from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { shipmentDetailQuery, type ShipmentDto } from '../api';
import { money, shipmentTone } from '../model';

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
  const result = useQuery(shipmentDetailQuery(id));
  const shipment = result.data;

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
      <DetailHeader
        title={shipment.no}
        subtitle={`${shipment.customer} · ${shipment.country} · ${shipment.createdAt}`}
        status={
          <StatusBadge tone={shipmentTone[shipment.status]}>
            {t(`shipments.status.${shipment.status}`)}
          </StatusBadge>
        }
        actions={
          <>
            <Button size="sm" variant="outline" onClick={onBack}>
              {t('common.back')}
            </Button>
            <Button size="sm" variant="outline" onClick={onTrack}>
              <Route data-icon="inline-start" />
              {t('shipments.track')}
            </Button>
            <Button size="sm" onClick={onPrint}>
              <Printer data-icon="inline-start" />
              {t('shipments.printLabel')}
            </Button>
          </>
        }
      />

      <DetailWorkspace>
        <DetailMain>
          <DetailSection title={t('shipments.tabs.basic')}>
            <DescriptionList
              columns={5}
              className="mt-0"
              items={[
                { label: t('shipments.columns.channel'), value: shipment.channel },
                { label: t('shipments.columns.tracking'), value: shipment.trackingNo },
                { label: t('shipments.columns.weight'), value: `${shipment.weight.toFixed(2)} kg` },
                { label: t('shipments.columns.fee'), value: money(shipment.fee) },
                { label: t('shipments.fields.warehouse'), value: shipment.warehouse },
              ]}
            />
          </DetailSection>

          <div className="grid gap-3 lg:grid-cols-2">
            <DetailSection title={t('shipments.sender')}>
              <DescriptionList
                columns={2}
                className="mt-0"
                items={[
                  { label: t('shipments.fields.customer'), value: shipment.sender.name },
                  { label: t('shipments.fields.phone'), value: shipment.sender.phone },
                  { label: t('shipments.fields.warehouse'), value: shipment.warehouse },
                  { label: t('shipments.fields.address'), value: shipment.sender.address },
                ]}
              />
            </DetailSection>
            <DetailSection title={t('shipments.receiver')}>
              <DescriptionList
                columns={2}
                className="mt-0"
                items={[
                  { label: t('shipments.fields.recipient'), value: shipment.receiver.name },
                  { label: t('shipments.fields.phone'), value: shipment.receiver.phone },
                  { label: t('shipments.fields.country'), value: shipment.receiver.country },
                  { label: t('shipments.fields.postalCode'), value: shipment.receiver.postalCode },
                  { label: t('shipments.fields.address'), value: shipment.receiver.address },
                ]}
              />
            </DetailSection>
          </div>

          <DetailSection title={t('shipments.parcel')}>
            <DescriptionList
              className="mt-0"
              items={shipment.parcels.map((parcel) => ({
                label: `${parcel.name} × ${parcel.quantity}`,
                value: `HS ${parcel.hsCode} · ${parcel.weight} kg · ${parcel.size}`,
                actions: <strong>{money(parcel.declaredValue)}</strong>,
              }))}
            />
          </DetailSection>

          <DetailSection title={t('shipments.tabs.fee')}>
            <DescriptionList
              columns={2}
              className="mt-0"
              items={[
                ...shipment.feeItems.map((item) => ({
                  label: item.label,
                  value: money(item.amount),
                })),
                { label: t('shipments.columns.fee'), value: money(shipment.fee) },
              ]}
            />
          </DetailSection>
        </DetailMain>

        <DetailAside>
          <DetailSection title={t('common.status')}>
            <DescriptionList
              className="mt-0"
              items={[
                {
                  label: t('common.status'),
                  value: t(`shipments.status.${shipment.status}`),
                },
                { label: t('shipments.columns.customer'), value: shipment.customer },
                { label: t('shipments.columns.country'), value: shipment.country },
              ]}
            />
          </DetailSection>
          <DetailSection title={t('shipments.trackTitle')}>
            <TrackingTimeline shipment={shipment} />
          </DetailSection>
        </DetailAside>
      </DetailWorkspace>
    </PageFrame>
  );
}

export function TrackingTimeline({ shipment }: { shipment: ShipmentDto }) {
  return (
    <DetailTimeline
      items={shipment.tracking.map((node) => ({
        id: node.id,
        title: node.title,
        meta: `${node.place} · ${node.occurredAt}`,
        state: node.current ? 'current' : node.completed ? 'complete' : 'pending',
      }))}
    />
  );
}
