import type { ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
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
  footer,
}: {
  tree: MenuNode[];
  subsystems: Subsystem[];
  collapsed: boolean;
  footer?: ReactNode;
}) {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  const groups = tree.map((n) => ({ node: n, pages: n.children?.length ? n.children : [n] }));

  // 折叠只是视觉压缩（w-0 + overflow-hidden），链接仍在 DOM——必须 inert 掐掉焦点与无障碍树，
  // 否则键盘用户会 Tab 进一排不可见链接。
  return (
    <aside
      inert={collapsed || undefined}
      aria-hidden={collapsed || undefined}
      className={cn(
        'flex shrink-0 flex-col pt-3 transition-[width,padding] duration-200',
        collapsed ? 'w-0 overflow-hidden px-0' : 'w-(--shell-inset-sidebar-w) pl-3 pr-2.5',
      )}
    >
      {!collapsed && (
        <div className="mb-3 flex items-center">
          <div className="min-w-0 flex-1">
            <SubsystemSwitcher subsystems={subsystems} variant="brand" />
          </div>
        </div>
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
                    'my-0.5 flex h-[var(--nav-item-h)] items-center gap-2.5 rounded-9 text-sm',
                    collapsed ? 'justify-center px-0' : 'px-3',
                    pathname === p.path
                      ? 'border border-(--nav-item-border-current) bg-(--nav-item-bg-current) font-semibold text-(--nav-item-fg-current) shadow-(--nav-item-shadow-current)'
                      : 'text-text-2 hover:bg-(--nav-item-bg-hover)',
                  )}
                >
                  <Icon name={p.icon ?? g.node.icon} className="size-[var(--nav-icon-size)] shrink-0" />
                  {!collapsed && <span className="truncate">{lv(p.label, i18n.language)}</span>}
                </Link>
              ) : null,
            )}
          </div>
        ))}
      </div>
      {footer && !collapsed && (
        <div
          data-testid="inset-sidebar-footer"
          className="mt-3 shrink-0 border-t border-(--page-section-divider) pb-3 pt-3"
        >
          {footer}
        </div>
      )}
    </aside>
  );
}
