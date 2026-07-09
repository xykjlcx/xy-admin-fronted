import type { ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { PanelLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/pro/SearchField';
import { featuresConfig } from '@/config';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import { Icon } from '@/lib/icon-registry';
import type { MenuNode } from '@/lib/menu-tree';
import type { Subsystem } from '@/modules/types';
import { SubsystemSwitcher } from './SubsystemSwitcher';

// Inset 导航（原型 L167-219）：通顶侧栏在 canvas 上，顶部品牌位（切换器 brand 变体）+ 分组平铺。
// 激活项浮起为白卡（bg-surface + 阴影）。collapsed 时只剩图标。
export function NavMenuInset({
  tree,
  subsystems,
  collapsed,
  onToggle,
  footer,
}: {
  tree: MenuNode[];
  subsystems: Subsystem[];
  collapsed: boolean;
  onToggle: () => void;
  footer?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const groups = tree.map((n) => ({ node: n, pages: n.children?.length ? n.children : [n] }));

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col pt-3 transition-[width] duration-200',
        collapsed ? 'w-16 px-3' : 'w-[calc(248px*var(--app-scale))] pl-3 pr-2.5',
      )}
    >
      <div className={cn('mb-3 flex gap-1.5', collapsed ? 'flex-col items-center' : 'items-center')}>
        <div className={cn('min-w-0', !collapsed && 'flex-1')}>
          <SubsystemSwitcher subsystems={subsystems} variant="brand" collapsed={collapsed} />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-text-3 hover:text-text"
          onClick={onToggle}
          aria-label={t('shell.nav.collapse')}
        >
          <PanelLeft className="size-4" />
        </Button>
      </div>
      {!collapsed && featuresConfig.showStubChrome && (
        <SearchField
          readOnly
          aria-label={t('shell.search')}
          placeholder={t('shell.search')}
          containerClassName="mb-3 h-9 w-full bg-surface"
          onFocus={(event) => {
            event.currentTarget.blur();
            toast(t('shell.toast.search'));
          }}
        />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.node.id}>
            {!collapsed && (
              <div className="px-3 pb-1.5 pt-3 text-[calc(11px*var(--app-scale))] font-semibold tracking-wide text-text-3">
                {lv(g.node.label, i18n.language)}
              </div>
            )}
            {g.pages.map((p) =>
              p.path ? (
                <Link
                  key={p.id}
                  to={p.path}
                  title={collapsed ? lv(p.label, i18n.language) : undefined}
                  className={cn(
                    'my-0.5 flex h-[calc(38px*var(--app-scale))] items-center gap-2.5 rounded-9 text-sm',
                    collapsed ? 'justify-center px-0' : 'px-3',
                    pathname === p.path
                      ? 'border border-(--nav-item-border-current) bg-(--nav-item-bg-current) font-semibold text-(--nav-item-fg-current) shadow-(--nav-item-shadow-current)'
                      : 'text-text-2 hover:bg-(--nav-item-bg-hover)',
                  )}
                >
                  <Icon name={p.icon ?? g.node.icon} className="size-[calc(18px*var(--app-scale))] shrink-0" />
                  {!collapsed && <span className="truncate">{lv(p.label, i18n.language)}</span>}
                </Link>
              ) : null,
            )}
          </div>
        ))}
      </div>
      {footer && (
        <div data-testid="inset-sidebar-footer" className="mt-3 shrink-0 pb-3">
          {footer}
        </div>
      )}
    </aside>
  );
}
