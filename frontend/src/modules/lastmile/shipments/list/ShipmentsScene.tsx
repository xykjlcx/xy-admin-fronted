import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DataTable } from '@/components/pro/DataTable';
import { FilterSelect } from '@/components/pro/FilterSelect';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { downloadFile } from '@/lib/download';
import { matchPermission } from '@/lib/permission';
import { shipmentApi, shipmentKeys, shipmentsQuery, type ShipmentFilter } from '../api';
import type { ShipmentListSearch } from '../types';
import { shipmentColumns } from './columns';

export function ShipmentsScene({
  permissions,
  search,
  onSearchChange,
  onNavigate,
}: {
  permissions: string[];
  search: ShipmentListSearch;
  onSearchChange: (search: ShipmentListSearch) => void;
  onNavigate: (target: 'new' | 'detail' | 'print' | 'track', id?: string) => void;
}) {
  const { t } = useTranslation('lastmile');
  const queryClient = useQueryClient();
  const result = useQuery(shipmentsQuery(search.keyword, search.status));
  const batchPrint = useMutation({
    mutationFn: shipmentApi.batchPrint,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      toast.success(t('shipments.toast.batchPrinted'));
    },
  });
  const exportShipments = useMutation({
    mutationFn: () =>
      downloadFile(
        `/api/lastmile/shipments/export?${new URLSearchParams({ keyword: search.keyword, status: search.status })}`,
        'shipments.csv',
      ),
    onError: () => toast.error(t('common.downloadFailed')),
  });
  const labels = useMemo(
    () => ({
      no: t('shipments.columns.no'),
      customer: t('shipments.columns.customer'),
      country: t('shipments.columns.country'),
      channel: t('shipments.columns.channel'),
      weight: t('shipments.columns.weight'),
      fee: t('shipments.columns.fee'),
      tracking: t('shipments.columns.tracking'),
      status: t('shipments.columns.status'),
      actions: t('shipments.columns.actions'),
      detail: t('common.detail'),
      print: t('shipments.print'),
      track: t('shipments.track'),
      more: t('common.actions'),
      ...Object.fromEntries(
        ['pending', 'printed', 'transit', 'delivered', 'exception', 'returned'].map((status) => [
          `status.${status}`,
          t(`shipments.status.${status}`),
        ]),
      ),
    }),
    [t],
  );
  const columns = useMemo(
    () =>
      shipmentColumns(labels, {
        detail: (id) => onNavigate('detail', id),
        print: (id) => onNavigate('print', id),
        track: (id) => onNavigate('track', id),
      }),
    [labels, onNavigate],
  );
  const stats = result.data?.stats;
  const statuses: ShipmentFilter[] = [
    'all',
    'pending',
    'printed',
    'transit',
    'delivered',
    'exception',
    'returned',
  ];
  return (
    <PageFrame breadcrumbs={[{ label: t('common.subsystem') }, { label: t('shipments.title') }]}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="ui-page-title text-xl font-semibold">{t('shipments.title')}</h1>
          <p className="mt-1 text-sm text-text-3">{t('shipments.description')}</p>
        </div>
        <div className="flex-1" />
        {matchPermission(permissions, 'lastmile:shipment:create') && (
          <Button onClick={() => onNavigate('new')}>
            <Plus data-icon="inline-start" />
            {t('shipments.create')}
          </Button>
        )}
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [t('shipments.stats.pending'), stats?.pending ?? 0],
          [t('shipments.stats.transit'), stats?.transit ?? 0],
          [t('shipments.stats.delivered'), stats?.delivered ?? 0],
          [t('shipments.stats.issues'), (stats?.exception ?? 0) + (stats?.returned ?? 0)],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-text-3">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <PageSurface>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <SearchField
            aria-label={t('shipments.search')}
            placeholder={t('shipments.search')}
            value={search.keyword}
            onChange={(event) => onSearchChange({ ...search, keyword: event.currentTarget.value })}
            containerClassName="w-[calc(300px*var(--app-scale))]"
          />
          <FilterSelect
            label={t('common.status')}
            value={search.status}
            options={statuses.map((value) => ({ value, label: t(`shipments.status.${value}`) }))}
            onValueChange={(status) => onSearchChange({ ...search, status })}
          />
          <div className="flex-1" />
          {matchPermission(permissions, 'lastmile:shipment:export') && (
            <Button
              variant="outline"
              size="sm"
              loading={exportShipments.isPending}
              onClick={() => exportShipments.mutate()}
            >
              <Download data-icon="inline-start" />
              {t('shipments.export')}
            </Button>
          )}
          {matchPermission(permissions, 'lastmile:shipment:print') && (
            <Button
              variant="outline"
              size="sm"
              loading={batchPrint.isPending}
              onClick={() => batchPrint.mutate()}
            >
              <Printer data-icon="inline-start" />
              {t('shipments.batchPrint')}
            </Button>
          )}
        </div>
        <div className="px-5 pb-5">
          <DataTable
            columns={columns}
            data={result.data?.list ?? []}
            rowKey={(row) => row.id}
            loading={result.isLoading}
            error={result.isError}
            errorText={t('common.loadFailed')}
            retryText={t('common.retry')}
            onRetry={() => void result.refetch()}
            emptyText={t('common.empty')}
            loadingText={t('common.loading')}
            onRowClick={(row) => onNavigate('detail', row.id)}
          />
        </div>
        <div className="border-t border-border px-5 py-3 text-sm text-text-3">
          {t('common.total', { count: result.data?.total ?? 0 })}
        </div>
      </PageSurface>
    </PageFrame>
  );
}
