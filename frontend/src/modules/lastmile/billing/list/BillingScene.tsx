import { useMutation, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DataTable } from '@/components/pro/DataTable';
import { FilterSelect } from '@/components/pro/FilterSelect';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { Button } from '@/components/ui/button';
import { downloadFile } from '@/lib/download';
import { matchPermission } from '@/lib/permission';
import { billsQuery, type BillDto, type BillFilter } from '../api';
import { money } from '../model';
export function BillingScene({
  permissions,
  systemAdmin = false,
  keyword,
  status,
  onFiltersChange,
}: {
  permissions: string[];
  systemAdmin?: boolean;
  keyword: string;
  status: BillFilter;
  onFiltersChange: (next: { keyword: string; status: BillFilter }) => void;
}) {
  const { t } = useTranslation('lastmile');
  const result = useQuery(billsQuery(keyword, status));
  const exportBills = useMutation({
    mutationFn: () =>
      downloadFile(
        `/api/lastmile/billing/export?${new URLSearchParams({ keyword, status })}`,
        'billing.csv',
      ),
    onError: () => toast.error(t('common.downloadFailed')),
  });
  const columns: ColumnDef<BillDto>[] = [
    { accessorKey: 'no', header: t('billing.columns.no'), size: 170 },
    { accessorKey: 'customer', header: t('billing.columns.customer'), size: 180 },
    { accessorKey: 'period', header: t('billing.columns.period'), size: 110 },
    { accessorKey: 'shipments', header: t('billing.columns.shipments'), size: 100 },
    {
      id: 'amount',
      header: t('billing.columns.amount'),
      size: 130,
      cell: ({ row }) => money(row.original.amount),
    },
    {
      id: 'status',
      header: t('billing.columns.status'),
      size: 110,
      cell: ({ row }) => (
        <StatusBadge
          tone={
            row.original.status === 'paid'
              ? 'success'
              : row.original.status === 'overdue'
                ? 'danger'
                : 'warning'
          }
        >
          {t(`billing.status.${row.original.status}`)}
        </StatusBadge>
      ),
    },
  ];
  const statuses: BillFilter[] = ['all', 'pending', 'paid', 'overdue'];
  return (
    <PageFrame breadcrumbs={[{ label: t('common.subsystem') }, { label: t('billing.title') }]}>
      <PageSurface>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <SearchField
            aria-label={t('billing.search')}
            placeholder={t('billing.search')}
            value={keyword}
            onChange={(event) => onFiltersChange({ keyword: event.currentTarget.value, status })}
            containerClassName="w-[calc(280px*var(--app-scale))]"
          />
          <FilterSelect
            label={t('common.status')}
            value={status}
            options={statuses.map((value) => ({ value, label: t(`billing.status.${value}`) }))}
            onValueChange={(next) => onFiltersChange({ keyword, status: next })}
          />
          <div className="flex-1" />
          {matchPermission({ permissions, systemAdmin }, 'lastmile:billing:export') && (
            <Button variant="outline" size="sm" loading={exportBills.isPending} onClick={() => exportBills.mutate()}>
              <Download data-icon="inline-start" />
              {t('billing.export')}
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
          />
        </div>
        <div className="flex justify-between border-t border-border px-5 py-3 text-sm">
          <span className="text-text-3">{t('common.total', { count: result.data?.total ?? 0 })}</span>
          <strong>{t('billing.receivable', { amount: money(result.data?.receivable ?? 0) })}</strong>
        </div>
      </PageSurface>
    </PageFrame>
  );
}
