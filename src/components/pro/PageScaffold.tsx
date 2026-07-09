import { createContext, Fragment, useContext, type ComponentProps, type ReactNode } from 'react';
import { AnimatedTabs } from '@/components/pro/AnimatedTabs';
import { cn } from '@/lib/utils';

export interface PageBreadcrumbItem {
  label: ReactNode;
}

interface PageFrameChromeValue {
  breadcrumbPrefix?: ReactNode;
}

const PageFrameChromeContext = createContext<PageFrameChromeValue>({});

export function PageFrameChromeProvider({
  value,
  children,
}: {
  value: PageFrameChromeValue;
  children: ReactNode;
}) {
  return <PageFrameChromeContext.Provider value={value}>{children}</PageFrameChromeContext.Provider>;
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
  const { breadcrumbPrefix } = useContext(PageFrameChromeContext);

  return (
    <section
      {...props}
      className={cn(
        'ui-page-frame flex flex-(--page-frame-flex) min-h-(--page-frame-min-h) flex-col bg-(--page-frame-bg) px-(--page-frame-px) py-(--page-frame-py) text-text',
        className,
      )}
      style={style}
    >
      <div
        data-slot="page-breadcrumb"
        className="mb-(--page-breadcrumb-mb) flex items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-3"
      >
        {breadcrumbPrefix && (
          <>
            {breadcrumbPrefix}
            <span
              aria-hidden="true"
              data-slot="page-breadcrumb-divider"
              className="h-4 w-px bg-(--page-breadcrumb-divider)"
            />
          </>
        )}
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
        'ui-page-surface flex flex-(--page-surface-flex) min-h-(--page-surface-min-h) flex-col overflow-hidden rounded-12 border border-(--page-surface-border) bg-(--page-surface-bg) shadow-(--page-surface-shadow)',
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
