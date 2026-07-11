import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageFrame } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { StatusBadge, type StatusBadgeTone } from '@/components/pro/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { overviewQuery } from '../api';

const toneByStatus: Record<string, StatusBadgeTone> = {
  pending: 'warning',
  printed: 'neutral',
  transit: 'neutral',
  delivered: 'success',
  exception: 'danger',
  returned: 'neutral',
};

export function OverviewScene() {
  const { t } = useTranslation('lastmile');
  const result = useQuery(overviewQuery);
  const data = result.data;
  return (
    <PageFrame breadcrumbs={[{ label: t('common.subsystem') }, { label: t('overview.title') }]}>
      <QueryState
        data={data}
        pending={result.isPending}
        error={result.isError}
        loadingLabel={t('common.loading')}
        errorLabel={t('common.loadFailed')}
        retryLabel={t('common.retry')}
        onRetry={() => void result.refetch()}
      >
        {(data) => (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.stats.map((stat) => (
              <Card key={stat.key}>
                <CardContent className="p-5">
                  <p className="text-sm text-text-3">{t(`overview.stats.${stat.key}`)}</p>
                  <p className="mt-2 text-2xl font-semibold text-text">{stat.value}</p>
                  <p className="mt-1 text-xs text-text-3">{stat.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>{t('overview.recent')}</CardTitle>
                <span className="text-xs text-text-3">{t('overview.realtime')}</span>
              </CardHeader>
              <CardContent className="grid gap-1">
                {data.recent.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border-b border-border py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text">{item.no}</p>
                      <p className="mt-1 truncate text-xs text-text-3">
                        {item.customer} · {item.country} · {item.channel}
                      </p>
                    </div>
                    <StatusBadge tone={toneByStatus[item.status] ?? 'neutral'}>
                      {t(`shipments.status.${item.status}`)}
                    </StatusBadge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('overview.channelUsage')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {data.channelUsage.map((item) => (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="text-text-3">{item.count}</span>
                    </div>
                    <ProgressBar value={item.percent} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </QueryState>
    </PageFrame>
  );
}
