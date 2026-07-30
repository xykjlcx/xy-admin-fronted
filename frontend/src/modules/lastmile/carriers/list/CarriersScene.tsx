import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/pro/DataTable';
import { DataToolbar, DataToolbarGroup } from '@/components/pro/DataToolbar';
import { DataTableRowActions } from '@/components/pro/DataTableRowActions';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { matchPermission } from '@/lib/permission';
import { carrierApi, carrierKeys, carriersQuery, type CarrierDto, type CarrierInput } from '../api';
import { CarrierFormDialog } from '../form';
export function CarriersScene({
  permissions,
  systemAdmin = false,
  keyword,
  onKeywordChange,
  onDetail,
}: {
  permissions: string[];
  systemAdmin?: boolean;
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onDetail: (id: string) => void;
}) {
  const { t } = useTranslation('lastmile');
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const result = useQuery(carriersQuery(keyword));
  const create = useMutation({
    mutationFn: carrierApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: carrierKeys.all });
      setCreating(false);
      toast.success(t('carriers.toast.created'));
    },
  });
  const columns: ColumnDef<CarrierDto>[] = [
    { accessorKey: 'name', header: t('carriers.columns.carrier'), size: 180 },
    { accessorKey: 'region', header: t('carriers.columns.region'), size: 150 },
    {
      id: 'services',
      header: t('carriers.columns.services'),
      size: 220,
      cell: ({ row }) => row.original.services.map((item) => item.name).join(' · '),
    },
    {
      id: 'channels',
      header: t('carriers.columns.channels'),
      size: 100,
      meta: { cellAlign: 'center', headerAlign: 'center' },
      cell: ({ row }) => row.original.channels.length,
    },
    {
      id: 'status',
      header: t('common.status'),
      size: 100,
      cell: ({ row }) => (
        <StatusBadge tone={row.original.enabled ? 'success' : 'neutral'}>
          {t(row.original.enabled ? 'common.enabled' : 'common.disabled')}
        </StatusBadge>
      ),
    },
    {
      id: 'actions',
      header: t('common.actions'),
      size: 90,
      meta: { headerAlign: 'end', cellAlign: 'end', stopRowClick: true },
      cell: ({ row }) => (
        <DataTableRowActions
          overflowLabel={t('common.actions')}
          actions={[{ id: 'detail', label: t('common.detail'), onSelect: () => onDetail(row.original.id) }]}
        />
      ),
    },
  ];
  return (
    <PageFrame breadcrumbs={[{ label: t('common.subsystem') }, { label: t('carriers.title') }]}>
      <div className="mb-3">
        <h1 className="ui-page-title text-xl font-semibold">{t('carriers.title')}</h1>
        <p className="mt-1 text-sm text-text-3">{t('carriers.description')}</p>
      </div>
      <PageSurface>
        <DataToolbar variant="surface" aria-label={t('carriers.title')}>
          <DataToolbarGroup>
            <SearchField
              aria-label={t('carriers.search')}
              placeholder={t('carriers.search')}
              value={keyword}
              onChange={(event) => onKeywordChange(event.currentTarget.value)}
              containerClassName="w-[calc(240px*var(--app-scale))]"
            />
          </DataToolbarGroup>
          <DataToolbarGroup align="end">
            {matchPermission({ permissions, systemAdmin }, 'lastmile:carrier:create') && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus data-icon="inline-start" />
                {t('carriers.create')}
              </Button>
            )}
          </DataToolbarGroup>
        </DataToolbar>
        <div className="px-3 pt-3">
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
            onRowClick={(row) => onDetail(row.id)}
          />
        </div>
      </PageSurface>
      {creating && (
        <CarrierFormDialog
          open
          onOpenChange={setCreating}
          submitting={create.isPending}
          onSubmit={(input: CarrierInput) => create.mutate(input)}
        />
      )}
    </PageFrame>
  );
}
