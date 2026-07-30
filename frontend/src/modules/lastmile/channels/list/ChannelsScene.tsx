import { useMemo, useState } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DataTable } from '@/components/pro/DataTable';
import {
  DataToolbar,
  DataToolbarGroup,
  SummaryStrip,
} from '@/components/pro/DataToolbar';
import { FilterSelect } from '@/components/pro/FilterSelect';
import { PageFrame, PageSurface } from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
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
  systemAdmin = false,
  keyword,
  kind,
  status,
  onFiltersChange,
  onNavigate,
}: {
  permissions: string[];
  systemAdmin?: boolean;
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
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="ui-page-title text-xl font-semibold">{t('channels.title')}</h1>
          <p className="mt-1 text-sm text-text-3">{t('channels.description')}</p>
        </div>
        <div className="flex-1" />
        {matchPermission({ permissions, systemAdmin }, 'lastmile:channel:create') && (
          <Button onClick={() => onNavigate('new')}>
            <Plus data-icon="inline-start" />
            {t('channels.create')}
          </Button>
        )}
      </div>
      <SummaryStrip
        className="mb-3"
        aria-label={t('channels.title')}
        items={[
          [
            `${t('channels.metrics.enabled')} · ${t('channels.metrics.channelTotal', { count: channelStats?.total ?? 0 })}`,
            String(channelStats?.enabled ?? 0),
          ],
          [
            `${t('channels.metrics.countries')} · ${t('channels.metrics.globalCoverage')}`,
            String(channelStats?.countries ?? 0),
          ],
          [
            `${t('channels.metrics.today')} · ${t('channels.metrics.todayTrend')}`,
            new Intl.NumberFormat(i18n.language).format(channelStats?.today ?? 0),
          ],
          [
            `${t('channels.metrics.success')} · ${t('channels.metrics.successTrend')}`,
            `${(channelStats?.successRate ?? 0).toFixed(2)}%`,
          ],
        ].map(([label, value]) => ({ label, value }))}
      />
      <PageSurface>
        <DataToolbar variant="surface" aria-label={t('channels.title')}>
          <DataToolbarGroup>
            <SearchField
              aria-label={t('channels.search')}
              placeholder={t('channels.search')}
              value={keyword}
              onChange={(event) => onFiltersChange({ keyword: event.currentTarget.value, kind, status })}
              containerClassName="w-[calc(240px*var(--app-scale))]"
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
          </DataToolbarGroup>
          <DataToolbarGroup align="end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFiltersChange({ keyword: '', kind: 'all', status: 'all' })}
            >
              {t('channels.reset')}
            </Button>
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
