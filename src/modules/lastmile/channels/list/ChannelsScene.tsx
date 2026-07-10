import { useMemo, useState } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DataTable } from '@/components/pro/DataTable';
import { FilterSelect } from '@/components/pro/FilterSelect';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { matchPermission } from '@/lib/permission';
import {
  channelApi,
  channelKeys,
  channelsQuery,
  type ChannelKindFilter,
  type ChannelStatusFilter,
} from '../api';
import { channelColumns } from './columns';
export function ChannelsScene({
  permissions,
  keyword,
  kind,
  status,
  onFiltersChange,
  onNavigate,
}: {
  permissions: string[];
  keyword: string;
  kind: ChannelKindFilter;
  status: ChannelStatusFilter;
  onFiltersChange: (next: { keyword: string; kind: ChannelKindFilter; status: ChannelStatusFilter }) => void;
  onNavigate: (target: 'new' | 'detail' | 'edit', id?: string) => void;
}) {
  const { t, i18n } = useTranslation('lastmile');
  const queryClient = useQueryClient();
  const [result, setSelection] = [
    useQuery(channelsQuery(keyword, kind, status)),
    useState<RowSelectionState>({}),
  ];
  const [rowSelection, setRowSelection] = setSelection;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: channelKeys.all });
  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => channelApi.toggle(id, enabled),
    onSuccess: async () => {
      await invalidate();
      toast.success(t('channels.toast.toggled'));
    },
  });
  const batch = useMutation({
    mutationFn: (ids: string[]) => channelApi.batchEnable(ids),
    onSuccess: async () => {
      await invalidate();
      setRowSelection({});
      toast.success(t('channels.toast.batchEnabled'));
    },
  });
  const labels = useMemo(
    () => ({
      code: t('channels.columns.code'),
      name: t('channels.columns.name'),
      kind: t('channels.columns.kind'),
      supplier: t('channels.columns.supplier'),
      carrier: t('channels.columns.carrier'),
      service: t('channels.columns.service'),
      countries: t('channels.columns.countries'),
      account: t('channels.columns.account'),
      cost: t('channels.columns.cost'),
      sell: t('channels.columns.sell'),
      status: t('channels.columns.status'),
      actions: t('channels.columns.actions'),
      detail: t('common.detail'),
      edit: t('common.edit'),
      'account.platform': t('channels.account.platform'),
      'account.enterprise': t('channels.account.enterprise'),
      'account.self': t('channels.account.self'),
      ...Object.fromEntries(
        ['express', 'line', 'postal', 'self'].map((value) => [`kind.${value}`, t(`channels.kind.${value}`)]),
      ),
    }),
    [t],
  );
  const columns = useMemo(
    () =>
      channelColumns(labels, {
        detail: (id) => onNavigate('detail', id),
        edit: (id) => onNavigate('edit', id),
        toggle: (id, enabled) => toggle.mutate({ id, enabled }),
      }),
    [labels, onNavigate, toggle],
  );
  const channelStats = result.data?.stats;
  const kinds: ChannelKindFilter[] = ['all', 'express', 'line', 'postal', 'self'];
  const statuses: ChannelStatusFilter[] = ['all', 'enabled', 'disabled'];
  return (
    <PageFrame breadcrumbs={[{ label: t('common.subsystem') }, { label: t('channels.title') }]}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="ui-page-title text-xl font-semibold">{t('channels.title')}</h1>
          <p className="mt-1 text-sm text-text-3">{t('channels.description')}</p>
        </div>
        <div className="flex-1" />
        {matchPermission(permissions, 'lastmile:channel:create') && (
          <Button onClick={() => onNavigate('new')}>
            <Plus data-icon="inline-start" />
            {t('channels.create')}
          </Button>
        )}
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            t('channels.metrics.enabled'),
            String(channelStats?.enabled ?? 0),
            t('channels.metrics.channelTotal', { count: channelStats?.total ?? 0 }),
          ],
          [
            t('channels.metrics.countries'),
            String(channelStats?.countries ?? 0),
            t('channels.metrics.globalCoverage'),
          ],
          [
            t('channels.metrics.today'),
            new Intl.NumberFormat(i18n.language).format(channelStats?.today ?? 0),
            t('channels.metrics.todayTrend'),
          ],
          [
            t('channels.metrics.success'),
            `${(channelStats?.successRate ?? 0).toFixed(2)}%`,
            t('channels.metrics.successTrend'),
          ],
        ].map(([label, value, hint]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-text-3">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
              <p className="mt-1 text-xs text-text-3">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <PageSurface>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <SearchField
            aria-label={t('channels.search')}
            placeholder={t('channels.search')}
            value={keyword}
            onChange={(event) => onFiltersChange({ keyword: event.currentTarget.value, kind, status })}
            containerClassName="w-[calc(260px*var(--app-scale))]"
          />
          <FilterSelect
            label={t('channels.columns.kind')}
            value={kind}
            options={kinds.map((value) => ({ value, label: t(`channels.kind.${value}`) }))}
            onValueChange={(next) => onFiltersChange({ keyword, kind: next, status })}
          />
          <FilterSelect
            label={t('common.status')}
            value={status}
            options={statuses.map((value) => ({ value, label: t(`channels.status.${value}`) }))}
            onValueChange={(next) => onFiltersChange({ keyword, kind, status: next })}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFiltersChange({ keyword: '', kind: 'all', status: 'all' })}
          >
            {t('channels.reset')}
          </Button>
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
            selection={{
              enabled: true,
              rowSelection,
              onRowSelectionChange: setRowSelection,
              selectAllAriaLabel: t('channels.selectPage'),
              rowSelectAriaLabel: (row) => t('channels.selectRow', { name: row.name }),
              renderBulkBar: (ids) => (
                <Button size="sm" loading={batch.isPending} onClick={() => batch.mutate(ids)}>
                  {t('channels.batchEnable')} · {ids.length}
                </Button>
              ),
            }}
          />
        </div>
      </PageSurface>
    </PageFrame>
  );
}
