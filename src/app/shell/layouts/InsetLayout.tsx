import { PanelLeft, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ShellLayoutProps } from './types';
import { NotificationBell, SHELL_NOTIFICATION_UNREAD } from '../widgets/NotificationBell';
import { AppearanceDrawer } from '../widgets/AppearanceDrawer';
import { DarkModeToggle } from '../widgets/DarkModeToggle';
import { LanguageMenu } from '../widgets/LanguageMenu';
import { NavMenuInset } from '../widgets/NavMenuInset';
import { UserMenu } from '../widgets/UserMenu';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PageFrameChromeProvider } from '@/components/pro/PageScaffold';
import { PageTransition } from '@/components/pro/PageTransition';
import { cn } from '@/lib/utils';

// 嵌入式布局（原型 L167-219 + shellStyle inset L4814）：整屏 canvas 底，通顶侧栏在左，
// 内容区是浮起白卡；全局搜索与快捷动作在侧栏，折叠入口通过 PageFrame 注入到面包屑左侧。
export function InsetLayout({
  menuTree,
  subsystems,
  collapsed,
  onCollapsedChange,
  children,
}: ShellLayoutProps) {
  const { t } = useTranslation();
  const toggleLabel = t(collapsed ? 'shell.nav.expand' : 'shell.nav.collapse');

  return (
    <div data-shell-layout="inset" className="h-screen flex w-full overflow-hidden bg-canvas text-text">
      <NavMenuInset
        tree={menuTree}
        subsystems={subsystems}
        collapsed={collapsed}
        footer={<InsetSidebarDock collapsed={collapsed} />}
      />
      <div className="relative m-2 ml-1 flex min-w-0 flex-1 flex-col overflow-hidden rounded-14 border border-border bg-surface shadow-inset-card">
        <main id="shell-main" className="min-w-0 flex-1 overflow-y-auto">
          <PageFrameChromeProvider
            value={{
              breadcrumbPrefix: (
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
              ),
            }}
          >
            <PageTransition>{children}</PageTransition>
          </PageFrameChromeProvider>
        </main>
      </div>
    </div>
  );
}

function InsetSidebarDock({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();

  return (
    <div className={cn('border-t border-border pt-3', collapsed ? 'flex flex-col items-center gap-2' : 'space-y-2')}>
      {collapsed ? (
        <CollapsedQuickActions label={t('shell.quickActions')} />
      ) : (
        <div className="grid grid-cols-4 gap-1 rounded-12 bg-surface p-1 shadow-card-sm">
          <NotificationBell />
          <AppearanceDrawer />
          <DarkModeToggle />
          <LanguageMenu side="right" align="start" />
        </div>
      )}
      <UserMenu variant={collapsed ? 'icon' : 'sidebar'} />
    </div>
  );
}

function CollapsedQuickActions({ label }: { label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative bg-surface shadow-card-sm"
          aria-label={label}
          title={label}
        >
          <Settings2 className="size-5" />
          {SHELL_NOTIFICATION_UNREAD > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[calc(15px*var(--app-scale))] min-w-[calc(15px*var(--app-scale))] items-center justify-center rounded-full border-[1.5px] border-surface bg-danger px-1 text-[calc(10px*var(--app-scale))] font-semibold text-white">
              {SHELL_NOTIFICATION_UNREAD}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="right" align="end" sideOffset={8} className="w-auto rounded-12 p-1">
        <div className="grid grid-cols-4 gap-1">
          <NotificationBell />
          <AppearanceDrawer />
          <DarkModeToggle />
          <LanguageMenu side="right" align="start" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
