import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MetricTrend {
  label: ReactNode;
  value: ReactNode;
  direction?: 'positive' | 'negative' | 'neutral';
}

export function Metric({
  label,
  value,
  trend,
  icon,
  className,
  ...props
}: Omit<ComponentProps<'article'>, 'title'> & {
  label: ReactNode;
  value: ReactNode;
  trend?: MetricTrend;
  icon?: ReactNode;
}) {
  const direction = trend?.direction ?? 'neutral';
  const symbol = direction === 'positive' ? '▲' : direction === 'negative' ? '▼' : '•';

  return (
    <article
      data-slot="metric"
      className={cn(
        'flex min-h-(--metric-min-h) min-w-0 flex-col rounded-10 border border-(--metric-border) bg-(--metric-bg) p-(--metric-spacing) shadow-(--metric-shadow)',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-2">
        <p className="min-w-0 flex-1 break-words text-xs text-(--metric-label-fg)">{label}</p>
        {icon ? (
          <span
            data-slot="metric-icon"
            aria-hidden="true"
            className="shrink-0 text-(--metric-icon-fg) [&>svg]:size-[calc(16px*var(--app-scale))]"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-2 min-w-0 break-all text-2xl font-semibold leading-none tabular-nums text-(--metric-value-fg)">
        {value}
      </p>
      {trend ? (
        <div className="mt-auto flex flex-wrap items-center gap-1 pt-2 text-xs text-(--metric-meta-fg)">
          <span>{trend.label}</span>
          <span
            data-direction={direction}
            className="font-medium data-[direction=negative]:text-(--metric-negative-fg) data-[direction=neutral]:text-(--metric-neutral-fg) data-[direction=positive]:text-(--metric-positive-fg)"
          >
            <span aria-hidden="true">{symbol} </span>
            {trend.value}
          </span>
        </div>
      ) : null}
    </article>
  );
}
