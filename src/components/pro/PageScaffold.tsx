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
