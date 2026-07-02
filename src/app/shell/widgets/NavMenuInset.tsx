import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import { Icon } from '@/lib/icon-registry';
import type { MenuNode } from '@/lib/menu-tree';
import type { Subsystem } from '@/modules/types';
import { SubsystemSwitcher } from './SubsystemSwitcher';

// Inset 导航（原型 L167-219）：通顶侧栏在 canvas 上，顶部品牌位（切换器 brand 变体）+ 分组平铺 + 底部折叠开关。
// 激活项浮起为白卡（bg-surface + 阴影）。collapsed 时只剩图标。
export function NavMenuInset({
  tree,
  subsystems,
  collapsed,
  onToggle,
}: {
  tree: MenuNode[];
  subsystems: Subsystem[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const groups = tree.map((n) => ({ node: n, pages: n.children?.length ? n.children : [n] }));

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col pt-3 transition-[width] duration-200',
        collapsed ? 'w-16 px-3' : 'w-[248px] pl-3 pr-2.5',
      )}
    >
      <div className="mb-3.5">
        <SubsystemSwitcher subsystems={subsystems} variant="brand" collapsed={collapsed} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.node.id}>
            {!collapsed && (
              <div className="px-3 pb-1.5 pt-3 text-[11px] font-semibold tracking-wide text-text-3">
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
                    'my-0.5 flex h-[38px] items-center gap-2.5 rounded-lg text-sm',
                    collapsed ? 'justify-center px-0' : 'px-3',
                    pathname === p.path
                      ? 'bg-surface font-semibold text-text shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                      : 'text-text-2 hover:bg-surface/60',
                  )}
                >
                  <Icon name={p.icon ?? g.node.icon} className="size-[18px] shrink-0" />
                  {!collapsed && <span className="truncate">{lv(p.label, i18n.language)}</span>}
                </Link>
              ) : null,
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'mt-2 flex h-12 items-center gap-2.5 border-t border-border text-[13px] text-text-2 hover:text-pri',
          collapsed ? 'justify-center px-0' : 'px-3',
        )}
      >
        <PanelLeft className="size-[18px] shrink-0" />
        {!collapsed && <span>{t('shell.nav.collapse')}</span>}
      </button>
    </aside>
  );
}
