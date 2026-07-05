import { Fragment, type ComponentProps, type ReactNode } from 'react';
import { AnimatedTabs } from '@/components/pro/AnimatedTabs';
import { cn } from '@/lib/utils';

export interface PageBreadcrumbItem {
  label: ReactNode;
}

type PageFrameProps = Omit<ComponentProps<'section'>, 'children'> & {
  breadcrumbs: PageBreadcrumbItem[];
  children: ReactNode;
};

export function PageFrame({
  breadcrumbs,
  children,
  className,
  style,
  ...props
}: PageFrameProps) {
  return (
    <section
      {...props}
      className={cn('flex min-h-0 flex-col bg-(--pro-page-bg) text-text', className)}
      style={{ padding: 'calc(20px * var(--app-scale)) calc(28px * var(--app-scale))', ...style }}
    >
      <div className="mb-4 flex items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-3">
        {breadcrumbs.map((item, index) => (
          <Fragment key={index}>
            {index > 0 && <span>›</span>}
            <span className={cn(index === breadcrumbs.length - 1 && 'text-text')}>{item.label}</span>
          </Fragment>
        ))}
      </div>
      {children}
    </section>
  );
}

type PageSurfaceProps = Omit<ComponentProps<'div'>, 'children'> & {
  children: ReactNode;
};

export function PageSurface({
  children,
  className,
  ...props
}: PageSurfaceProps) {
  return (
    <div
      {...props}
      className={cn(
        'flex min-h-[calc(640px*var(--app-scale))] flex-col overflow-hidden rounded-12 border border-(--pro-panel-border) bg-(--pro-panel-bg) shadow-xs',
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface PageTabItem<TValue extends string> {
  value: TValue;
  label: ReactNode;
}

export function PageTabs<TValue extends string>({
  value,
  items,
  onValueChange,
}: {
  value: TValue;
  items: PageTabItem<TValue>[];
  onValueChange: (value: TValue) => void;
}) {
  return <AnimatedTabs value={value} items={items} onValueChange={onValueChange} variant="page" />;
}
