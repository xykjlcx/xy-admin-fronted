import type { ShellLayoutProps } from './types';
import { NotificationBell } from '../widgets/NotificationBell';
import { AppearanceDrawer } from '../widgets/AppearanceDrawer';
import { DarkModeToggle } from '../widgets/DarkModeToggle';
import { LanguageMenu } from '../widgets/LanguageMenu';
import { NavMenuInset } from '../widgets/NavMenuInset';
import { UserMenu } from '../widgets/UserMenu';
import { PageTransition } from '@/components/pro/PageTransition';
import { cn } from '@/lib/utils';

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
        footer={<InsetSidebarDock collapsed={collapsed} />}
      />
      <div className="relative m-2 ml-1 flex min-w-0 flex-1 flex-col overflow-hidden rounded-14 border border-border bg-surface shadow-inset-card">
        <main id="shell-main" className="min-w-0 flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

function InsetSidebarDock({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('border-t border-border pt-3', collapsed ? 'flex flex-col items-center gap-2' : 'space-y-2')}>
      <div
        className={cn(
          'bg-surface shadow-card-sm',
          collapsed
            ? 'flex flex-col items-center gap-1 rounded-12 p-1'
            : 'grid grid-cols-4 gap-1 rounded-12 p-1',
        )}
      >
        <NotificationBell />
        <AppearanceDrawer />
        <DarkModeToggle />
        <LanguageMenu side="right" align="start" />
      </div>
      <UserMenu variant={collapsed ? 'icon' : 'sidebar'} />
    </div>
  );
}
