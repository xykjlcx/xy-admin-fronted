import { Fragment, useEffect, useState, type ReactNode } from 'react';
import type { PageBreadcrumbItem } from '@/components/pro/PageScaffold';
import { cn } from '@/lib/utils';

export function ShellBreadcrumbs({ breadcrumbs }: { breadcrumbs: PageBreadcrumbItem[] }) {
  if (breadcrumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      data-slot="shell-breadcrumbs"
      className="flex min-w-0 items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-3"
    >
      {breadcrumbs.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <span aria-hidden="true" className="shrink-0 text-text-3">
              /
            </span>
          )}
          <span className={cn('truncate', index === breadcrumbs.length - 1 && 'text-text')}>
            {item.label}
          </span>
        </Fragment>
      ))}
    </nav>
  );
}

// 可组合顶栏：布局决定 left/center/right 各放什么（位置知识归布局）。
// 毛玻璃行为自含（原型 L4816-4820）：监听 #shell-main 滚动，越过阈值切换到 surface-blur + backdrop-blur。
// transparentUntilScroll：inset 布局下未滚动时透明（内容卡在下方，Header 嵌卡内）。
export function ShellHeader({
  left,
  center,
  right,
  transparentUntilScroll = false,
}: {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  transparentUntilScroll?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const main = document.getElementById('shell-main');
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 4);
    onScroll();
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  return (
    // 三列 grid 而非绝对定位居中：center 参与布局，窄屏下 left 列 min-w-0 截断、搜索自身 max-w 收缩，
    // 三区永不重叠（绝对定位的 center 不产生 flex 压力，会直接叠在变宽的面包屑上）。
    <header
      className={cn(
        'absolute inset-x-0 top-0 z-20 grid h-14 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[calc(18px*var(--app-scale))] border-b border-border px-5 transition-[background-color,box-shadow,border-color] duration-200 max-lg:grid-cols-[minmax(0,1fr)_auto_auto] max-lg:gap-2 max-lg:px-2',
        scrolled
          ? 'bg-surface-blur shadow-header backdrop-blur-[14px] backdrop-saturate-[1.6]'
          : transparentUntilScroll
            ? 'bg-transparent'
            : 'bg-(--shell-header-bg)',
      )}
    >
      <div data-slot="shell-header-left" className="flex min-w-0 items-center gap-[calc(18px*var(--app-scale))]">
        {left}
      </div>
      <div data-slot="shell-header-center" className="flex min-w-0 items-center justify-center gap-3">
        {center}
      </div>
      <div data-slot="shell-header-right" className="flex items-center justify-end gap-1.5">
        {right}
      </div>
    </header>
  );
}
