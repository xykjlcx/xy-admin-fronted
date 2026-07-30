import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DataToolbar({
  variant = 'plain',
  className,
  ...props
}: ComponentProps<'div'> & { variant?: 'plain' | 'surface' }) {
  return (
    <div
      data-slot="data-toolbar"
      data-variant={variant}
      role="toolbar"
      className={cn(
        'flex min-h-[calc(46px*var(--app-scale))] flex-wrap items-center gap-[calc(8px*var(--app-scale))] px-[calc(12px*var(--app-scale))] py-[calc(8px*var(--app-scale))]',
        variant === 'surface' &&
          'border-b border-(--page-section-divider) bg-(--pro-toolbar-bg)',
        className,
      )}
      {...props}
    />
  );
}

export function DataToolbarGroup({
  align = 'start',
  className,
  ...props
}: ComponentProps<'div'> & { align?: 'start' | 'end' }) {
  return (
    <div
      data-slot="data-toolbar-group"
      data-align={align}
      role="group"
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-[calc(8px*var(--app-scale))]',
        align === 'end' && 'ml-auto justify-end',
        className,
      )}
      {...props}
    />
  );
}

export interface SummaryStripItem {
  label: ReactNode;
  value: ReactNode;
}

export function SummaryStrip({
  items,
  className,
  ...props
}: Omit<ComponentProps<'dl'>, 'children'> & { items: SummaryStripItem[] }) {
  return (
    <dl
      data-slot="summary-strip"
      className={cn(
        'flex min-h-[calc(42px*var(--app-scale))] flex-wrap items-stretch overflow-hidden rounded-10 border border-(--page-section-divider) bg-(--pro-toolbar-bg)',
        className,
      )}
      {...props}
    >
      {items.map((item, index) => (
        <div
          key={index}
          data-slot="summary-strip-item"
          className="flex min-w-[calc(144px*var(--app-scale))] flex-1 items-center gap-[calc(8px*var(--app-scale))] border-r border-(--page-section-divider) px-[calc(12px*var(--app-scale))] py-[calc(8px*var(--app-scale))] last:border-r-0"
        >
          <dt className="truncate text-xs text-text-3">{item.label}</dt>
          <dd className="ml-auto text-sm font-semibold tabular-nums text-text">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
