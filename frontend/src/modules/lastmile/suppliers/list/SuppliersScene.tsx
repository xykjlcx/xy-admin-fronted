import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DataTable } from '@/components/pro/DataTable';
import { DataToolbar, DataToolbarGroup } from '@/components/pro/DataToolbar';
import { DataTableRowActions } from '@/components/pro/DataTableRowActions';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { matchPermission } from '@/lib/permission';
import { supplierApi, supplierKeys, suppliersQuery, type SupplierDto, type SupplierInput } from '../api';
import { SupplierFormDialog } from '../form';
export function SuppliersScene({
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
  const result = useQuery(suppliersQuery(keyword));
  const create = useMutation({
    mutationFn: supplierApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      setCreating(false);
      toast.success(t('suppliers.toast.created'));
    },
  });
  const columns: ColumnDef<SupplierDto>[] = [
    { accessorKey: 'name', header: t('suppliers.columns.supplier'), size: 170 },
    { accessorKey: 'type', header: t('suppliers.fields.type'), size: 130 },
    {
      id: 'carriers',
      header: t('suppliers.fields.carriers'),
      size: 160,
      cell: ({ row }) => row.original.carriers.join(' · '),
    },
    { accessorKey: 'credentialLabel', header: t('suppliers.fields.account'), size: 190 },
    { accessorKey: 'settlement', header: t('suppliers.fields.settlement'), size: 110 },
    {
      id: 'channels',
      header: t('suppliers.columns.channels'),
      size: 80,
      meta: { cellAlign: 'center', headerAlign: 'center' },
      cell: ({ row }) => row.original.channels.length,
    },
    {
      id: 'status',
      header: t('common.status'),
      size: 90,
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
    <PageFrame breadcrumbs={[{ label: t('common.subsystem') }, { label: t('suppliers.title') }]}>
      <div className="mb-3">
        <h1 className="ui-page-title text-xl font-semibold">{t('suppliers.title')}</h1>
        <p className="mt-1 text-sm text-text-3">{t('suppliers.description')}</p>
      </div>
      <PageSurface>
        <DataToolbar variant="surface" aria-label={t('suppliers.title')}>
          <DataToolbarGroup>
            <SearchField
              aria-label={t('suppliers.search')}
              placeholder={t('suppliers.search')}
              value={keyword}
              onChange={(event) => onKeywordChange(event.currentTarget.value)}
              containerClassName="w-[calc(240px*var(--app-scale))]"
            />
          </DataToolbarGroup>
          <DataToolbarGroup align="end">
            {matchPermission({ permissions, systemAdmin }, 'lastmile:supplier:create') && (
              <Button size="sm" onClick={() => setCreating(true)}>
                <Plus data-icon="inline-start" />
                {t('suppliers.create')}
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
        <SupplierFormDialog
          open
          onOpenChange={setCreating}
          submitting={create.isPending}
          onSubmit={(input: SupplierInput) => create.mutate(input)}
        />
      )}
    </PageFrame>
  );
}
