import { createContext, Fragment, useContext, useLayoutEffect, type ComponentProps, type ReactNode } from 'react';
import { AnimatedTabs } from '@/components/pro/AnimatedTabs';
import { cn } from '@/lib/utils';

export interface PageBreadcrumbItem {
  // 收窄为 string：header 模式下 label 会被逐项比较去重（use-shell-breadcrumbs），
  // ReactNode 每次渲染都是新引用，会击穿比较造成 Shell header 空转重渲染。
  label: string;
}

interface PageFrameChromeValue {
  breadcrumbPrefix?: ReactNode;
  breadcrumbPlacement?: 'frame' | 'header';
  onHeaderBreadcrumbsChange?: (breadcrumbs: PageBreadcrumbItem[]) => void;
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
  const {
    breadcrumbPrefix,
    breadcrumbPlacement = 'frame',
    onHeaderBreadcrumbsChange,
  } = useContext(PageFrameChromeContext);
  const renderFrameBreadcrumb = breadcrumbPlacement === 'frame';

  // 发布与清空拆成两个 effect：页面每次渲染传入的 breadcrumbs 是新数组字面量，
  // 若发布 effect 自带清空 cleanup，会先发 [] 再发新值，击穿 useShellBreadcrumbs 的相等短路，
  // 导致 Shell header 随页面每次渲染空转。拆开后清空只在卸载/placement 切换时发生。
  useLayoutEffect(() => {
    if (breadcrumbPlacement !== 'header') return;
    onHeaderBreadcrumbsChange?.(breadcrumbs);
  }, [breadcrumbPlacement, breadcrumbs, onHeaderBreadcrumbsChange]);
  useLayoutEffect(() => {
    if (breadcrumbPlacement !== 'header') return;
    return () => onHeaderBreadcrumbsChange?.([]);
  }, [breadcrumbPlacement, onHeaderBreadcrumbsChange]);

  return (
    <section
      {...props}
      className={cn(
        'ui-page-frame flex flex-(--page-frame-flex) min-h-(--page-frame-min-h) flex-col bg-(--page-frame-bg) px-(--page-frame-px) py-(--page-frame-py) text-text',
        className,
      )}
      style={style}
    >
      {renderFrameBreadcrumb && (
        <div
          data-slot="page-breadcrumb"
          className="mb-(--page-breadcrumb-mb) flex min-h-[calc(32px*var(--app-scale))] items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-3"
        >
          <div data-slot="page-breadcrumb-start" className="flex min-w-0 items-center gap-2">
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
                <span className={cn('truncate', index === breadcrumbs.length - 1 && 'text-text')}>{item.label}</span>
              </Fragment>
            ))}
          </div>
        </div>
      )}
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

export function PageSplit({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-testid="page-split"
      className={cn(
        'grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]',
        className,
      )}
      {...props}
    />
  );
}

export function PageThreePane({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-testid="page-three-pane"
      className={cn(
        'grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,5fr)]',
        className,
      )}
      {...props}
    />
  );
}

export function PagePane({
  variant,
  className,
  ...props
}: ComponentProps<'section'> & { variant: 'navigation' | 'master' | 'detail' }) {
  return (
    <section
      data-slot="page-pane"
      data-variant={variant}
      className={cn(
        'flex min-h-0 min-w-0 flex-col',
        (variant === 'navigation' || variant === 'master') &&
          'border-r border-(--page-pane-divider) bg-(--side-list-bg)',
        variant === 'detail' && 'bg-(--page-surface-bg)',
        className,
      )}
      {...props}
    />
  );
}

export function PagePaneHeader({
  title,
  meta,
  actions,
  ariaLabel,
}: {
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <div
      data-slot="page-pane-header"
      role={ariaLabel ? 'toolbar' : undefined}
      aria-label={ariaLabel}
      className="flex min-h-[calc(52px*var(--app-scale))] items-center justify-between gap-3 border-b border-(--page-section-divider) px-4 py-2"
    >
      <div data-slot="page-pane-heading" className="flex min-w-0 flex-col items-start">
        <h2 className="max-w-full truncate text-sm font-semibold text-text">{title}</h2>
        {meta ? (
          <span data-slot="page-pane-meta" className="max-w-full truncate text-xs text-text-3">
            {meta}
          </span>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PagePaneToolbar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-pane-toolbar"
      className={cn('border-b border-(--page-section-divider) px-4 py-2.5', className)}
      {...props}
    />
  );
}

export function PagePaneBody({
  tone = 'default',
  className,
  ...props
}: ComponentProps<'div'> & { tone?: 'default' | 'canvas' }) {
  return (
    <div
      data-slot="page-pane-body"
      data-tone={tone}
      className={cn(
        'min-h-0 flex-1 overflow-y-auto p-3',
        tone === 'canvas' && 'bg-(--pro-page-bg)',
        className,
      )}
      {...props}
    />
  );
}

export function PagePaneFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="page-pane-footer"
      className={cn('border-t border-(--page-section-divider) p-3', className)}
      {...props}
    />
  );
}

export function PageSection({
  title,
  description,
  leading,
  actions,
  variant = 'subtle',
  children,
  className,
  ...props
}: Omit<ComponentProps<'section'>, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
  variant?: 'subtle' | 'card' | 'plain';
}) {
  return (
    <section
      data-slot="page-section"
      data-variant={variant}
      className={cn(
        'rounded-10 p-3',
        variant === 'subtle' && 'bg-(--pro-page-bg)',
        variant === 'card' &&
          'border border-(--page-section-divider) bg-(--pro-panel-bg) shadow-card-sm',
        variant === 'plain' && 'rounded-none bg-transparent p-0',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {leading ? (
            <span
              data-slot="page-section-leading"
              className="flex size-9 shrink-0 items-center justify-center rounded-10 bg-(--accent-emphasis-soft) text-(--accent-emphasis)"
            >
              {leading}
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-text">{title}</h3>
            {description ? <p className="mt-1 truncate text-xs text-text-3">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
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
  ariaLabel,
  trailing,
}: {
  value: TValue;
  items: PageTabItem<TValue>[];
  onValueChange: (value: TValue) => void;
  ariaLabel?: string;
  trailing?: ReactNode;
}) {
  return (
    <AnimatedTabs
      value={value}
      items={items}
      onValueChange={onValueChange}
      variant="page"
      ariaLabel={ariaLabel}
      trailing={trailing}
    />
  );
}
