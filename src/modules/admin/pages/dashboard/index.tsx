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
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
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
  { key: 'newMembers', tone: 'primary', icon: UserPlus },
  { key: 'activeUsers', tone: 'success', icon: Activity },
  { key: 'newRoles', tone: 'violet', icon: Shield },
  { key: 'auditLogs', tone: 'warning', icon: List },
] satisfies { key: DashboardMetricKey; tone: keyof typeof toneClass; icon: typeof UserPlus }[];

const quickEntries = [
  { key: 'members', icon: Users, tone: 'primary' },
  { key: 'roles', icon: Shield, tone: 'violet' },
  { key: 'logs', icon: FileText, tone: 'teal' },
  { key: 'files', icon: Folder, tone: 'warning' },
  { key: 'company', icon: Building2, tone: 'cyan' },
  { key: 'reports', icon: BarChart3, tone: 'danger' },
] as const;

const todoItems = [
  { key: 'phone', icon: Phone, tone: 'primary', statusTone: 'primary' },
  { key: 'onboard', icon: Check, tone: 'success', statusTone: 'danger' },
  { key: 'interview', icon: UserPlus, tone: 'warning', statusTone: 'warning' },
] satisfies {
  key: DashboardTodoItemKey;
  tone: keyof typeof toneClass;
  statusTone: keyof typeof toneClass;
  icon: typeof UserPlus;
}[];

const todoStatKeys = ['pending', 'done', 'overdue'] satisfies DashboardTodoStatKey[];

const toneClass = {
  primary: 'bg-pri-soft text-pri',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  violet: 'bg-pri-soft text-pri',
  teal: 'bg-success-soft text-success',
  cyan: 'bg-pri-soft text-pri',
} as const;

export function DashboardView({ overview }: DashboardViewProps) {
  const { t } = useTranslation('admin');

  return (
    <section
      className="flex min-h-0 flex-col gap-4 text-text"
      style={{ padding: 'calc(24px * var(--app-scale)) calc(28px * var(--app-scale))' }}
    >
      <CompanyBanner overview={overview} />

      <div className="grid gap-4 lg:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;
          const metric = overview.metrics[item.key];
          return (
            <article key={item.key} className="rounded-12 border border-border bg-surface p-5 shadow-card">
              <div className="mb-4 flex items-start justify-between">
                <span className="text-[calc(13px*var(--app-scale))] text-text-3">
                  {t(`dashboard.metrics.${item.key}.label`)}
                </span>
                <span className={cn('flex size-[calc(38px*var(--app-scale))] items-center justify-center rounded-10', toneClass[item.tone])}>
                  <Icon className="size-[calc(18px*var(--app-scale))]" />
                </span>
              </div>
              <div className="text-[calc(30px*var(--app-scale))] font-semibold leading-none text-text tabular-nums">
                {metric.value}
              </div>
              <div className="mt-3 flex items-center gap-1 text-[calc(12px*var(--app-scale))] text-text-3">
                <span>{t('dashboard.metrics.compare')}</span>
                <span className={cn(metric.negative ? 'text-danger' : 'text-success')}>
                  {metric.negative ? '▼' : '▲'} {metric.delta}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <section className="rounded-12 border border-border bg-surface p-6 shadow-card">
        <h2 className="text-base font-semibold text-text">{t('dashboard.quick.title')}</h2>
        <div className="mt-7 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {quickEntries.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key} type="button" className="flex flex-col items-center gap-3 rounded-10 p-2 text-sm text-text-2 transition-colors hover:bg-bg">
                <span className={cn('flex size-[calc(48px*var(--app-scale))] items-center justify-center rounded-12 text-white', quickTone(item.tone))}>
                  <Icon className="size-[calc(22px*var(--app-scale))]" />
                </span>
                <span>{t(`dashboard.quick.${item.key}`)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_calc(416px*var(--app-scale))]">
        <section className="rounded-12 border border-border bg-surface p-6 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-text">
                <span className="h-[calc(16px*var(--app-scale))] w-[calc(3px*var(--app-scale))] rounded-full bg-pri" />
                {t('dashboard.trend.title')}
              </h2>
              <p className="mt-2 text-[calc(12px*var(--app-scale))] text-text-3">{t('dashboard.trend.unit')}</p>
            </div>
            <div className="flex rounded-10 bg-surface-2 p-1 text-[calc(12px*var(--app-scale))] text-text-2">
              {['month', 'quarter', 'halfYear', 'year'].map((key) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    'rounded-8 px-3 py-1.5',
                    key === 'halfYear' ? 'bg-pri text-white shadow-card-sm' : 'hover:text-text',
                  )}
                >
                  {t(`dashboard.trend.ranges.${key}`)}
                </button>
              ))}
            </div>
          </div>
          <TrendChart />
        </section>

        <section className="rounded-12 border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text">
            <span className="h-[calc(16px*var(--app-scale))] w-[calc(3px*var(--app-scale))] rounded-full bg-success" />
            {t('dashboard.todo.title')}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {todoStatKeys.map((key) => {
              const stat = overview.todo.stats[key];
              return (
                <div key={key} className="rounded-10 bg-surface-2 py-3 text-center">
                  <div className={cn('text-[calc(25px*var(--app-scale))] font-semibold tabular-nums', key === 'done' ? 'text-success' : key === 'overdue' ? 'text-danger' : 'text-pri')}>
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[calc(12px*var(--app-scale))] text-text-3">{stat.label}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 divide-y divide-border">
            {todoItems.map((item) => {
              const Icon = item.icon;
              const todo = overview.todo.items[item.key];
              return (
                <div key={item.key} className="flex items-center gap-3 py-3">
                  <span className={cn('flex size-[calc(36px*var(--app-scale))] items-center justify-center rounded-10', toneClass[item.tone])}>
                    <Icon className="size-[calc(17px*var(--app-scale))]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[calc(13px*var(--app-scale))] font-medium text-text">{todo.title}</div>
                    <div className="mt-0.5 text-[calc(12px*var(--app-scale))] text-text-3">{todo.time}</div>
                  </div>
                  <span className={cn('rounded-6 px-2 py-1 text-[calc(12px*var(--app-scale))]', toneClass[item.statusTone])}>
                    {todo.status}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}

function CompanyBanner({ overview }: { overview: DashboardOverviewDto }) {
  const { t } = useTranslation('admin');

  return (
    <section className="flex items-center justify-between rounded-12 border border-border bg-surface px-6 py-5 shadow-card">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-[calc(54px*var(--app-scale))] shrink-0 items-center justify-center rounded-12 bg-pri text-[calc(26px*var(--app-scale))] font-semibold text-white">
          {overview.company.mark}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="ui-page-title truncate text-[calc(20px*var(--app-scale))] font-semibold text-text">{overview.company.name}</h1>
            <span className="rounded-6 bg-surface-2 px-2 py-1 text-[calc(12px*var(--app-scale))] text-text-3">
              {overview.company.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-text-2">{overview.company.meta}</p>
        </div>
      </div>
      <button type="button" className="rounded-8 bg-pri px-4 py-2 text-sm font-medium text-white shadow-card-sm hover:bg-pri-hover">
        {t('dashboard.company.action')}
      </button>
    </section>
  );
}

function TrendChart() {
  const { t } = useTranslation('admin');
  const linePoints = '0,157.1 69.1,147.5 138.2,151.6 207.3,132.4 276.4,137.9 345.5,114.6 414.5,122.8 483.6,103.6 552.7,110.5 621.8,80.3 690.9,58.4 760,20';
  const areaPoints = `0,200 ${linePoints} 760,200`;

  return (
    <div className="relative">
      <svg viewBox="0 0 760 200" preserveAspectRatio="none" className="h-[calc(200px*var(--app-scale))] w-full" role="img" aria-label={t('dashboard.trend.title')}>
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
        <polyline points={linePoints} fill="none" stroke="url(#dashboardTrendLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="760" cy="20" r="5" fill="var(--surface)" stroke="var(--pri)" strokeWidth="3" />
      </svg>
      <div className="absolute left-full top-[calc(20px*var(--app-scale))] -translate-x-1/2 -translate-y-[130%] rounded-8 bg-pri px-3 py-1.5 text-[calc(12px*var(--app-scale))] text-white shadow-popover">
        {t('dashboard.trend.tooltip')}
      </div>
      <div className="mt-2.5 flex justify-between text-[calc(11px*var(--app-scale))] text-text-3">
        <span>{t('dashboard.trend.months.jan')}</span>
        <span>{t('dashboard.trend.months.mar')}</span>
        <span>{t('dashboard.trend.months.may')}</span>
        <span>{t('dashboard.trend.months.jul')}</span>
        <span>{t('dashboard.trend.months.sep')}</span>
        <span>{t('dashboard.trend.months.dec')}</span>
      </div>
    </div>
  );
}

function quickTone(tone: (typeof quickEntries)[number]['tone']) {
  if (tone === 'warning') return 'bg-warning';
  if (tone === 'danger') return 'bg-danger';
  if (tone === 'teal') return 'bg-success';
  if (tone === 'cyan') return 'bg-pri';
  if (tone === 'violet') return 'bg-pri';
  return 'bg-pri';
}
