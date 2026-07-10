import { cn } from '@/lib/utils';
import type { ShellLayoutProps } from './types';
import { useShellBreadcrumbs } from './use-shell-breadcrumbs';
import { ShellBreadcrumbs, ShellHeader } from '../widgets/ShellHeader';
import { SubsystemSwitcher } from '../widgets/SubsystemSwitcher';
import { GlobalSearch } from '../widgets/GlobalSearch';
import { NotificationBell } from '../widgets/NotificationBell';
import { HeaderActions } from '../widgets/HeaderActions';
import { NavMenuSidebar } from '../widgets/NavMenuSidebar';
import { PageTransition } from '@/components/pro/PageTransition';
import { PageFrameChromeProvider } from '@/components/pro/PageScaffold';

// 飞书经典：通栏 Header 在上，下方 = 侧栏树 + 内容区（原型 rootStyle 列向分支 L4810-4824）。
// Header 绝对定位覆于顶部，侧栏与 main 各 pt-14 让出 56px。
export function SidebarLayout({
  menuTree,
  subsystems,
  collapsed,
  onCollapsedChange,
  children,
}: ShellLayoutProps) {
  const { breadcrumbs, chrome } = useShellBreadcrumbs();

  return (
    <div
      data-shell-layout="sidebar"
      className="h-screen relative flex w-full flex-col overflow-hidden bg-bg text-text"
    >
      <ShellHeader
        left={
          <div className="flex min-w-0 items-center gap-3">
            <SubsystemSwitcher subsystems={subsystems} variant="header" />
            {breadcrumbs.length > 0 && (
              <span aria-hidden="true" className="h-4 w-px bg-(--page-breadcrumb-divider)" />
            )}
            <ShellBreadcrumbs breadcrumbs={breadcrumbs} />
          </div>
        }
        center={
          <>
            <GlobalSearch />
            <NotificationBell />
          </>
        }
        right={<HeaderActions />}
      />
      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            'flex shrink-0 flex-col border-r border-border bg-chrome pt-14 transition-[width] duration-200',
            collapsed ? 'w-16' : 'w-[calc(232px*var(--app-scale))]',
          )}
        >
          <NavMenuSidebar
            tree={menuTree}
            collapsed={collapsed}
            onToggle={() => onCollapsedChange(!collapsed)}
          />
        </aside>
        <main id="shell-main" className="min-w-0 flex-1 overflow-y-auto pt-14">
          <PageFrameChromeProvider value={chrome}>
            <PageTransition>{children}</PageTransition>
          </PageFrameChromeProvider>
        </main>
      </div>
    </div>
  );
}
