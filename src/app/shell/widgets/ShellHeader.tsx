import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
    <header
      className={cn(
        'absolute inset-x-0 top-0 z-20 flex h-14 items-center gap-[calc(18px*var(--app-scale))] border-b border-border px-5 transition-[background-color,box-shadow,border-color] duration-200',
        scrolled
          ? 'bg-surface-blur shadow-header backdrop-blur-[14px] backdrop-saturate-[1.6]'
          : transparentUntilScroll
            ? 'bg-transparent'
            : 'bg-chrome',
      )}
    >
      {left}
      {center && (
        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">{center}</div>
      )}
      <div className="ml-auto flex items-center gap-1.5">{right}</div>
    </header>
  );
}
