import { PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { ShellLayoutProps } from './types';
import { ShellHeader } from '../widgets/ShellHeader';
import { GlobalSearch } from '../widgets/GlobalSearch';
import { NotificationBell } from '../widgets/NotificationBell';
import { HeaderActions } from '../widgets/HeaderActions';
import { NavMenuInset } from '../widgets/NavMenuInset';
import { PageTransition } from '@/components/pro/PageTransition';

// 嵌入式布局（原型 L167-219 + shellStyle inset L4814）：整屏 canvas 底，通顶侧栏在左，
// 内容区是浮起白卡（m-2 ml-0 rounded-xl border shadow），Header 嵌卡内、未滚动时透明。
export function InsetLayout({
  menuTree,
  subsystems,
  collapsed,
  onCollapsedChange,
  children,
}: ShellLayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="h-screen flex w-full overflow-hidden bg-canvas text-text">
      <NavMenuInset
        tree={menuTree}
        subsystems={subsystems}
        collapsed={collapsed}
        onToggle={() => onCollapsedChange(!collapsed)}
      />
      <div className="relative m-2 ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-inset-card">
        <ShellHeader
          left={
            <Button
              variant="ghost"
              size="icon"
              className="text-text-2 hover:text-text-2"
              onClick={() => onCollapsedChange(!collapsed)}
              aria-label={t('shell.nav.collapse')}
            >
              <PanelLeft className="size-5" />
            </Button>
          }
          center={
            <>
              <GlobalSearch />
              <NotificationBell />
            </>
          }
          right={<HeaderActions />}
          transparentUntilScroll
        />
        <main id="shell-main" className="min-w-0 flex-1 overflow-y-auto pt-14">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
