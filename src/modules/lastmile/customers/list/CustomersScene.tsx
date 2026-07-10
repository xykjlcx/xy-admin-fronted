import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DataTable } from '@/components/pro/DataTable';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { matchPermission } from '@/lib/permission';
import { customerApi, customerKeys, customersQuery, type CreateCustomerInput } from '../api';
import { CustomerFormDialog } from '../form';
import { customerColumns } from './columns';

export function CustomersScene({
  permissions,
  keyword,
  onKeywordChange,
  onDetail,
}: {
  permissions: string[];
  keyword: string;
  onKeywordChange: (keyword: string) => void;
  onDetail: (id: string) => void;
}) {
  const { t } = useTranslation('lastmile');
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const result = useQuery(customersQuery(keyword));
  const create = useMutation({
    mutationFn: customerApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all });
      setCreating(false);
      toast.success(t('customers.toast.created'));
    },
  });
  const labels = useMemo(
    () => ({
      customer: t('customers.columns.customer'),
      code: t('customers.columns.code'),
      type: t('customers.columns.type'),
      channels: t('customers.columns.channels'),
      pricing: t('customers.columns.pricing'),
      balance: t('customers.columns.balance'),
      status: t('customers.columns.status'),
      actions: t('customers.columns.actions'),
      detail: t('common.detail'),
      ...Object.fromEntries(
        ['active', 'trial', 'overdue', 'suspended'].map((status) => [
          `status.${status}`,
          t(`customers.status.${status}`),
        ]),
      ),
    }),
    [t],
  );
  return (
    <PageFrame breadcrumbs={[{ label: t('common.subsystem') }, { label: t('customers.title') }]}>
      <PageSurface>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <SearchField
            aria-label={t('customers.search')}
            placeholder={t('customers.search')}
            value={keyword}
            onChange={(event) => onKeywordChange(event.currentTarget.value)}
            containerClassName="w-[calc(280px*var(--app-scale))]"
          />
          <div className="flex-1" />
          {matchPermission(permissions, 'lastmile:customer:create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus data-icon="inline-start" />
              {t('customers.create')}
            </Button>
          )}
        </div>
        <div className="px-5 pb-5">
          <DataTable
            columns={customerColumns(labels, onDetail)}
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
        <div className="border-t border-border px-5 py-3 text-sm text-text-3">
          {t('common.total', { count: result.data?.total ?? 0 })}
        </div>
      </PageSurface>
      {creating && (
        <CustomerFormDialog
          open
          onOpenChange={setCreating}
          submitting={create.isPending}
          onSubmit={(input: CreateCustomerInput) => create.mutate(input)}
        />
      )}
    </PageFrame>
  );
}
