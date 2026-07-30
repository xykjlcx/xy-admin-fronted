import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DataTable } from '@/components/pro/DataTable';
import { DataToolbar, DataToolbarGroup } from '@/components/pro/DataToolbar';
import { FilterSelect } from '@/components/pro/FilterSelect';
import { PageFrame, PageSurface, PageTabs, type PageTabItem } from '@/components/pro/PageScaffold';
import { SearchField } from '@/components/pro/SearchField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { downloadFile } from '@/lib/download';
import { matchPermission } from '@/lib/permission';
import { loginLogsQuery, operationLogsQuery, type LoginResult, type OperationType } from '../api';
import { loginColumns, operationColumns } from './columns';

type LogTab = 'operation' | 'login';

export function LogsScene({ permissions, systemAdmin = false }: { permissions: string[]; systemAdmin?: boolean }) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const [tab, setTab] = useState<LogTab>('operation');
  const [keyword, setKeyword] = useState('');
  const [operationType, setOperationType] = useState<OperationType>('all');
  const [loginResult, setLoginResult] = useState<LoginResult>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const operations = useQuery(operationLogsQuery(keyword, operationType, startDate, endDate));
  const logins = useQuery(loginLogsQuery(keyword, loginResult, startDate, endDate));
  const exportLogs = useMutation({
    mutationFn: ({ url, filename }: { url: string; filename: string }) => downloadFile(url, filename),
    onError: () => toast.error(tCommon('errors.mutationFailed')),
  });
  const labels = useMemo(
    () => ({
      time: t('logs.columns.time'),
      operator: t('logs.columns.operator'),
      module: t('logs.columns.module'),
      type: t('logs.columns.type'),
      target: t('logs.columns.target'),
      ip: t('logs.columns.ip'),
      loginTime: t('logs.columns.loginTime'),
      user: t('logs.columns.user'),
      result: t('logs.columns.result'),
      location: t('logs.columns.location'),
      device: t('logs.columns.device'),
      'type.create': t('logs.types.create'),
      'type.edit': t('logs.types.edit'),
      'type.del': t('logs.types.del'),
      'type.export': t('logs.types.export'),
      'type.perm': t('logs.types.perm'),
      'type.config': t('logs.types.config'),
      'result.ok': t('logs.results.ok'),
      'result.fail': t('logs.results.fail'),
    }),
    [t],
  );
  const canViewLogin = matchPermission({ permissions, systemAdmin }, 'audit:login:view');
  const tabs: PageTabItem<LogTab>[] = [
    { value: 'operation', label: t('logs.tabs.operation') },
    ...(canViewLogin ? [{ value: 'login' as const, label: t('logs.tabs.login') }] : []),
  ];
  const canExport = matchPermission(
    { permissions, systemAdmin },
    tab === 'operation' ? 'audit:oplog:export' : 'audit:login:export',
  );
  const exportCurrent = () => {
    const params = new URLSearchParams({ keyword, startDate, endDate });
    if (tab === 'operation') {
      params.set('type', operationType);
      exportLogs.mutate({ url: `/api/audit/operation-logs/export?${params}`, filename: 'operation-logs.csv' });
    } else {
      params.set('result', loginResult);
      exportLogs.mutate({ url: `/api/audit/login-logs/export?${params}`, filename: 'login-logs.csv' });
    }
  };

  return (
    <PageFrame breadcrumbs={[{ label: t('logs.breadcrumbGroup') }, { label: t('logs.title') }]}>
      <PageSurface>
        <div className="border-b border-(--page-section-divider) px-3 pt-2.5">
          <PageTabs
            value={tab}
            items={tabs}
            onValueChange={(next) => {
              setTab(next);
              setKeyword('');
            }}
          />
        </div>
        <div className="flex flex-col gap-3 p-3">
          <DataToolbar variant="surface">
            <DataToolbarGroup>
            <SearchField
              aria-label={t('logs.search')}
              placeholder={t('logs.search')}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              containerClassName="w-[calc(260px*var(--app-scale))]"
            />
            {tab === 'operation' ? (
              <FilterSelect
                label={t('logs.filters.type')}
                value={operationType}
                onValueChange={setOperationType}
                options={(
                  ['all', 'create', 'edit', 'del', 'export', 'perm', 'config'] as OperationType[]
                ).map((value) => ({ value, label: t(`logs.types.${value}`) }))}
              />
            ) : (
              <FilterSelect
                label={t('logs.filters.result')}
                value={loginResult}
                onValueChange={setLoginResult}
                options={(['all', 'ok', 'fail'] as LoginResult[]).map((value) => ({
                  value,
                  label: t(`logs.results.${value}`),
                }))}
              />
            )}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                inputSize="sm"
                aria-label={t('logs.filters.startDate')}
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.currentTarget.value)}
                className="w-[calc(136px*var(--app-scale))]"
              />
              <span className="text-sm text-text-3">~</span>
              <Input
                type="date"
                inputSize="sm"
                aria-label={t('logs.filters.endDate')}
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.currentTarget.value)}
                className="w-[calc(136px*var(--app-scale))]"
              />
            </div>
            </DataToolbarGroup>
            {canExport && (
              <DataToolbarGroup align="end">
                <Button variant="outline" size="sm" loading={exportLogs.isPending} onClick={exportCurrent}>
                  <Download data-icon="inline-start" />
                  {t('logs.actions.export')}
                </Button>
              </DataToolbarGroup>
            )}
          </DataToolbar>
          {tab === 'operation' ? (
            <DataTable
              columns={operationColumns(labels)}
              data={operations.data?.list ?? []}
              rowKey={(row) => row.id}
              loading={operations.isLoading}
              error={operations.isError}
              errorText={tCommon('errors.refetchFailed')}
              retryText={tCommon('errors.retry')}
              onRetry={() => void operations.refetch()}
              emptyText={t('logs.empty.operation')}
              loadingText={t('logs.loading')}
            />
          ) : (
            <DataTable
              columns={loginColumns(labels)}
              data={logins.data?.list ?? []}
              rowKey={(row) => row.id}
              loading={logins.isLoading}
              error={logins.isError}
              errorText={tCommon('errors.refetchFailed')}
              retryText={tCommon('errors.retry')}
              onRetry={() => void logins.refetch()}
              emptyText={t('logs.empty.login')}
              loadingText={t('logs.loading')}
            />
          )}
          <span className="text-sm text-text-3">
            {t('logs.total', {
              count: tab === 'operation' ? (operations.data?.total ?? 0) : (logins.data?.total ?? 0),
            })}
          </span>
        </div>
      </PageSurface>
    </PageFrame>
  );
}
