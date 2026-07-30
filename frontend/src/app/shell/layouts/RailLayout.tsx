import type { ShellLayoutProps } from './types';
import { useShellBreadcrumbs } from './use-shell-breadcrumbs';
import { ShellBreadcrumbs, ShellHeader } from '../widgets/ShellHeader';
import { SubsystemSwitcher } from '../widgets/SubsystemSwitcher';
import { GlobalSearch } from '../widgets/GlobalSearch';
import { NotificationBell } from '../widgets/NotificationBell';
import { HeaderActions } from '../widgets/HeaderActions';
import { NavMenuRail } from '../widgets/NavMenuRail';
import { PageTransition } from '@/components/pro/PageTransition';
import { PageFrameChromeProvider } from '@/components/pro/PageScaffold';

// 图标栏布局（原型 L222-241）：左侧两栏通顶（76px 图标 rail + 192px 二级面板），右侧列 = Header + 内容。
// 切换器随原型置于 Header（notInset 分支），不重复放入 rail 顶部。collapsed 对 rail 无意义（rail 恒为图标态）。
export function RailLayout({ menuTree, subsystems, children }: ShellLayoutProps) {
  const { breadcrumbs, chrome } = useShellBreadcrumbs();

  return (
    <div className="h-screen flex w-full overflow-hidden bg-surface text-text">
      <NavMenuRail tree={menuTree} />
      <div className="relative flex min-w-0 flex-1 flex-col bg-bg">
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
        <main id="shell-main" className="min-w-0 flex-1 overflow-y-auto pt-(--shell-header-h)">
          <PageFrameChromeProvider value={chrome}>
            <PageTransition>{children}</PageTransition>
          </PageFrameChromeProvider>
        </main>
      </div>
    </div>
  );
}
