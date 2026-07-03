import { LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ShellLayoutProps } from './types';
import { ShellHeader } from '../widgets/ShellHeader';
import { SubsystemSwitcher } from '../widgets/SubsystemSwitcher';
import { GlobalSearch } from '../widgets/GlobalSearch';
import { NotificationBell } from '../widgets/NotificationBell';
import { HeaderActions } from '../widgets/HeaderActions';
import { NavMenuSidebar } from '../widgets/NavMenuSidebar';
import { PageTransition } from '@/components/pro/PageTransition';

// 飞书经典：通栏 Header 在上，下方 = 侧栏树 + 内容区（原型 rootStyle 列向分支 L4810-4824）。
// Header 绝对定位覆于顶部，侧栏与 main 各 pt-14 让出 56px。
export function SidebarLayout({
  menuTree,
  subsystems,
  collapsed,
  onCollapsedChange,
  children,
}: ShellLayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="h-screen relative flex w-full flex-col overflow-hidden bg-bg text-text">
      <ShellHeader
        left={
          <>
            <div className="flex w-[calc(212px*var(--app-scale))] shrink-0 items-center gap-2.5">
              <span
                className="flex size-[calc(30px*var(--app-scale))] shrink-0 items-center justify-center rounded-8 text-white"
                style={{
                  background:
                    'linear-gradient(135deg, var(--pri), color-mix(in srgb, var(--pri) 60%, white))',
                }}
              >
                <LayoutGrid className="size-[calc(18px*var(--app-scale))]" />
              </span>
              <span className="truncate text-[calc(17px*var(--app-scale))] font-bold tracking-wide text-text">
                {t('app.name')}
              </span>
            </div>
            <SubsystemSwitcher subsystems={subsystems} variant="header" />
          </>
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
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
