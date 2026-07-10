import { PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ShellLayoutProps } from './types';
import { useShellBreadcrumbs } from './use-shell-breadcrumbs';
import { ShellBreadcrumbs } from '../widgets/ShellHeader';
import { AppearanceDrawer } from '../widgets/AppearanceDrawer';
import { DarkModeToggle } from '../widgets/DarkModeToggle';
import { GlobalSearch } from '../widgets/GlobalSearch';
import { LanguageMenu } from '../widgets/LanguageMenu';
import { NotificationBell } from '../widgets/NotificationBell';
import { NavMenuInset } from '../widgets/NavMenuInset';
import { UserMenu } from '../widgets/UserMenu';
import { UpdateStatus } from '../widgets/UpdateStatus';
import { Button } from '@/components/ui/button';
import { PageFrameChromeProvider } from '@/components/pro/PageScaffold';
import { PageTransition } from '@/components/pro/PageTransition';
import { cn } from '@/lib/utils';

// 嵌入式布局（原型 L167-219 + shellStyle inset L4814）：整屏 canvas 底，通顶侧栏在左，
// 内容区是浮起白卡；全局搜索、快捷动作、折叠入口和面包屑统一放在内容卡顶栏。
export function InsetLayout({
  menuTree,
  subsystems,
  collapsed,
  onCollapsedChange,
  children,
}: ShellLayoutProps) {
  const { t } = useTranslation();
  const { breadcrumbs, chrome } = useShellBreadcrumbs();
  const toggleLabel = t(collapsed ? 'shell.nav.expand' : 'shell.nav.collapse');

  return (
    <div data-shell-layout="inset" className="h-screen flex w-full overflow-hidden bg-canvas text-text">
      <NavMenuInset
        tree={menuTree}
        subsystems={subsystems}
        collapsed={collapsed}
        footer={<UserMenu variant="sidebar" />}
      />
      <div
        data-slot="inset-shell-surface"
        className={cn(
          'relative m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-14 border border-border bg-surface shadow-inset-card',
          !collapsed && 'ml-1',
        )}
      >
        {/* 三列 grid 而非绝对定位居中：中列搜索参与布局，窄屏下左右两列有真实空间约束，
            面包屑靠 min-w-0 截断、搜索靠自身 max-w 收缩，三区永不重叠 */}
        <div
          data-slot="inset-shell-header"
          className="desktop-drag-region grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-(--page-breadcrumb-divider) px-(--page-frame-px)"
        >
          <div
            data-slot="inset-shell-header-start"
            className="desktop-no-drag flex min-w-0 items-center gap-3"
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-text-3 hover:text-text"
              onClick={() => onCollapsedChange(!collapsed)}
              aria-label={toggleLabel}
              title={toggleLabel}
            >
              <PanelLeft className="size-4" />
            </Button>
            {breadcrumbs.length > 0 && (
              <span aria-hidden="true" className="h-4 w-px bg-(--page-breadcrumb-divider)" />
            )}
            <ShellBreadcrumbs breadcrumbs={breadcrumbs} />
          </div>
          <div
            data-slot="inset-shell-header-center"
            className="desktop-no-drag flex min-w-0 items-center justify-center"
          >
            <GlobalSearch />
          </div>
          <div
            data-slot="inset-shell-header-suffix"
            className="inset-window-controls-right desktop-no-drag flex items-center justify-end gap-1.5"
          >
            <UpdateStatus />
            <NotificationBell />
            <AppearanceDrawer />
            <DarkModeToggle />
            <LanguageMenu />
            {/* 折叠时侧栏 footer 的用户菜单不可达，这里兜底一个 icon 入口，保证登出/个人中心永远可达 */}
            {collapsed && <UserMenu variant="icon" />}
          </div>
        </div>
        <main id="shell-main" className="min-w-0 flex-1 overflow-y-auto">
          <PageFrameChromeProvider value={chrome}>
            <PageTransition>{children}</PageTransition>
          </PageFrameChromeProvider>
        </main>
      </div>
    </div>
  );
}
