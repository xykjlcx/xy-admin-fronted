import { useQuery } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageFrame } from '@/components/pro/PageScaffold';
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
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex size-12 items-center justify-center rounded-12 bg-(--accent-muted) text-(--accent-emphasis)">
            <Truck />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="ui-page-title text-xl font-semibold">{shipment.trackingNo}</h1>
              <StatusBadge tone={shipmentTone[shipment.status]}>
                {t(`shipments.status.${shipment.status}`)}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-text-3">
              {shipment.no} · {shipment.channel} · {shipment.country}
            </p>
          </div>
          <div className="flex-1" />
          <Button variant="outline" onClick={onBack}>
            {t('common.back')}
          </Button>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t('shipments.trackTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TrackingTimeline shipment={shipment} />
        </CardContent>
      </Card>
    </PageFrame>
  );
}
