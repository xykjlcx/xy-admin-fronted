import {
  Activity,
  BarChart3,
  Building2,
  Check,
  FileText,
  Folder,
  List,
  Phone,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Metric } from '@/components/pro/Metric';
import { PageFrame } from '@/components/pro/PageScaffold';
import { SummaryStrip } from '@/components/pro/DataToolbar';
import { StatusBadge, type StatusBadgeTone } from '@/components/pro/StatusBadge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  dashboardOverviewQuery,
  type DashboardMetricKey,
  type DashboardOverviewDto,
  type DashboardTodoItemKey,
  type DashboardTodoStatKey,
} from '@/modules/admin/api/dashboard.api';

interface DashboardViewProps {
  overview: DashboardOverviewDto;
}

// DashboardPage 只负责从 Query 缓存取数据；DashboardView 只渲染展示。
// 这个拆法让后续真实指标、mock 指标或截图测试都能复用同一个纯展示层。
export function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardOverviewQuery);

  return <DashboardView overview={data} />;
}

const metrics = [
  { key: 'newMembers', icon: UserPlus },
  { key: 'activeUsers', icon: Activity },
  { key: 'newRoles', icon: Shield },
  { key: 'auditLogs', icon: List },
] satisfies { key: DashboardMetricKey; icon: typeof UserPlus }[];

const quickEntries = [
  { key: 'members', icon: Users },
  { key: 'roles', icon: Shield },
  { key: 'logs', icon: FileText },
  { key: 'files', icon: Folder },
  { key: 'company', icon: Building2 },
  { key: 'reports', icon: BarChart3 },
] as const;

// 有真实页面的快捷入口直接导航；没有的走 stub toast（不留无反馈的假按钮）。
// search 传目标路由的默认值：两条路由的 validateSearch 均为必填结构（catch 只兜运行时）。
const quickEntryNav = {
  members: { to: '/admin/users', search: { page: 1, pageSize: 10, status: 'all', keyword: '' } },
  roles: { to: '/admin/roles', search: { roleId: '' } },
} as const satisfies Partial<Record<(typeof quickEntries)[number]['key'], object>>;

function isNavEntry(key: (typeof quickEntries)[number]['key']): key is keyof typeof quickEntryNav {
  return key in quickEntryNav;
}

const todoItems = [
  { key: 'phone', icon: Phone, statusTone: 'neutral' },
  { key: 'onboard', icon: Check, statusTone: 'danger' },
  { key: 'interview', icon: UserPlus, statusTone: 'warning' },
] satisfies {
  key: DashboardTodoItemKey;
  statusTone: StatusBadgeTone;
  icon: typeof UserPlus;
}[];

const todoStatKeys = ['pending', 'done', 'overdue'] satisfies DashboardTodoStatKey[];

export function DashboardView({ overview }: DashboardViewProps) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();
  const navigate = useNavigate();
  const stub = () => toast(tCommon('shell.toast.stub'));

  return (
    <PageFrame breadcrumbs={[{ label: t('dashboard.navGroup') }, { label: t('dashboard.navTitle') }]}>
      <div className="grid gap-3">
      <CompanyBanner overview={overview} />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          const metric = overview.metrics[item.key];
          return (
            <Metric
              key={item.key}
              label={t(`dashboard.metrics.${item.key}.label`)}
              value={metric.value}
              icon={<Icon />}
              trend={{
                label: t('dashboard.metrics.compare'),
                value: metric.delta,
                direction: metric.negative ? 'negative' : 'positive',
              }}
            />
          );
        })}
      </div>

      <Card spacing="compact">
        <CardHeader>
          <CardTitle>{t('dashboard.quick.title')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {quickEntries.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.key}
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  if (isNavEntry(item.key)) void navigate(quickEntryNav[item.key]);
                  else stub();
                }}
              >
                <Icon data-icon="inline-start" />
                <span>{t(`dashboard.quick.${item.key}`)}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_calc(360px*var(--app-scale))]">
        <Card spacing="compact">
          <CardHeader>
            <CardTitle>{t('dashboard.trend.title')}</CardTitle>
            <CardDescription>{t('dashboard.trend.unit')}</CardDescription>
            <CardAction>
              <div className="flex items-center gap-1">
                {['month', 'quarter', 'halfYear', 'year'].map((key) => (
                  <Button
                    key={key}
                    type="button"
                    size="xs"
                    variant={key === 'halfYear' ? 'primary' : 'ghost'}
                    onClick={stub}
                  >
                    {t(`dashboard.trend.ranges.${key}`)}
                  </Button>
                ))}
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <TrendChart points={overview.trend} />
          </CardContent>
        </Card>

        <Card spacing="compact">
          <CardHeader>
            <CardTitle>{t('dashboard.todo.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <SummaryStrip
              aria-label={t('dashboard.todo.title')}
              items={todoStatKeys.map((key) => ({
                label: overview.todo.stats[key].label,
                value: overview.todo.stats[key].value,
              }))}
            />
            <div className="mt-3 divide-y divide-border">
              {todoItems.map((item) => {
                const Icon = item.icon;
                const todo = overview.todo.items[item.key];
                return (
                  <div key={item.key} className="flex items-center gap-2 py-2">
                    <Icon data-icon="inline-start" className="size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text">
                        {todo.title}
                      </div>
                      <div className="mt-0.5 text-xs text-text-3">{todo.time}</div>
                    </div>
                    <StatusBadge tone={item.statusTone}>
                      {todo.status}
                    </StatusBadge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </PageFrame>
  );
}

function CompanyBanner({ overview }: { overview: DashboardOverviewDto }) {
  const { t } = useTranslation('admin');
  const { t: tCommon } = useTranslation();

  return (
    <Card spacing="compact">
      <CardContent className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{overview.company.mark}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="ui-page-title truncate text-xl font-semibold text-text">
              {overview.company.name}
            </h1>
            <StatusBadge tone="neutral">{overview.company.status}</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-text-3">{overview.company.meta}</p>
        </div>
        <Button className="ml-auto" type="button" size="sm" onClick={() => toast(tCommon('shell.toast.stub'))}>
          {t('dashboard.company.action')}
        </Button>
      </CardContent>
    </Card>
  );
}

function TrendChart({ points }: { points: DashboardOverviewDto['trend'] }) {
  const { t } = useTranslation('admin');
  const max = Math.max(1, ...points.map((point) => point.value));
  const linePoints = points
    .map((point, index) => {
      const x = points.length === 1 ? 380 : (index / (points.length - 1)) * 760;
      const y = 180 - (point.value / max) * 160;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const areaPoints = `0,200 ${linePoints} 760,200`;
  const last = points.at(-1)!;
  const lastY = 180 - (last.value / max) * 160;
  const labels = points.filter((_, index) => index % 2 === 0 || index === points.length - 1);

  return (
    <div className="relative">
      <svg
        viewBox="0 0 760 200"
        preserveAspectRatio="none"
        className="h-[calc(200px*var(--app-scale))] w-full"
        role="img"
        aria-label={t('dashboard.trend.title')}
      >
        <defs>
          <linearGradient id="dashboardTrendLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--pri)" />
            <stop offset="100%" stopColor="var(--success)" />
          </linearGradient>
          <linearGradient id="dashboardTrendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--pri)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#dashboardTrendFill)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="url(#dashboardTrendLine)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="760" cy={lastY} r="5" fill="var(--surface)" stroke="var(--pri)" strokeWidth="3" />
      </svg>
      <div className="absolute left-full top-[calc(20px*var(--app-scale))] -translate-x-1/2 -translate-y-[130%] rounded-8 bg-(--accent-emphasis) px-3 py-1.5 text-[calc(12px*var(--app-scale))] text-white shadow-popover">
        {last.value}
      </div>
      <div className="mt-2.5 flex justify-between text-[calc(11px*var(--app-scale))] text-text-3">
        {labels.map((point) => <span key={point.month}>{point.month.slice(5)}</span>)}
      </div>
    </div>
  );
}
