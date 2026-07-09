import type { ShellLayoutProps } from './types';
import { NotificationBell } from '../widgets/NotificationBell';
import { HeaderActions } from '../widgets/HeaderActions';
import { NavMenuInset } from '../widgets/NavMenuInset';
import { PageTransition } from '@/components/pro/PageTransition';

// 嵌入式布局（原型 L167-219 + shellStyle inset L4814）：整屏 canvas 底，通顶侧栏在左，
// 内容区是浮起白卡；全局搜索和折叠入口回到侧栏，主区仅保留轻量快捷操作。
export function InsetLayout({
  menuTree,
  subsystems,
  collapsed,
  onCollapsedChange,
  children,
}: ShellLayoutProps) {
  return (
    <div data-shell-layout="inset" className="h-screen flex w-full overflow-hidden bg-canvas text-text">
      <NavMenuInset
        tree={menuTree}
        subsystems={subsystems}
        collapsed={collapsed}
        onToggle={() => onCollapsedChange(!collapsed)}
      />
      <div className="relative m-2 ml-1 flex min-w-0 flex-1 flex-col overflow-hidden rounded-14 border border-border bg-surface shadow-inset-card">
        <div className="absolute right-4 top-3 z-20 flex items-center gap-1 rounded-12 bg-surface/85 px-1.5 py-1 shadow-card-sm backdrop-blur-[12px]">
          <NotificationBell />
          <HeaderActions />
        </div>
        <main id="shell-main" className="min-w-0 flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
