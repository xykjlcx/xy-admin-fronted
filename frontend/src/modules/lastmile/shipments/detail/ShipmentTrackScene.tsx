import { useQuery } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DetailHeader, PageFrame } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { shipmentDetailQuery } from '../api';
import { shipmentTone } from '../model';
import { TrackingTimeline } from './ShipmentDetailScene';

export function ShipmentTrackScene({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useTranslation('lastmile');
  const result = useQuery(shipmentDetailQuery(id));
  const shipment = result.data;
  if (!shipment)
    return (
      <PageFrame breadcrumbs={[{ label: t('shipments.title') }, { label: t('shipments.trackTitle') }]}>
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
    <PageFrame breadcrumbs={[{ label: t('shipments.title') }, { label: t('shipments.trackTitle') }]}>
      <DetailHeader
        title={shipment.trackingNo}
        subtitle={`${shipment.no} · ${shipment.channel} · ${shipment.country}`}
        status={
          <StatusBadge tone={shipmentTone[shipment.status]}>
            {t(`shipments.status.${shipment.status}`)}
          </StatusBadge>
        }
        actions={
          <Button variant="outline" onClick={onBack}>
            {t('common.back')}
          </Button>
        }
      />
      <Card spacing="compact">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="size-4 text-text-3" />
            {t('shipments.trackTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrackingTimeline shipment={shipment} />
        </CardContent>
      </Card>
    </PageFrame>
  );
}
