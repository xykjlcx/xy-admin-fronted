import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import { Icon } from '@/lib/icon-registry';
import type { MenuNode } from '@/lib/menu-tree';

// Rail 导航：共享 200px 总宽，60px 图标栏 + 140px 二级面板。
// 顶级 dir = 一组，其 children = 页面；顶级 leaf 自成一组（页面即自身）。当前组 = 含当前路由的组。
export function NavMenuRail({ tree }: { tree: MenuNode[] }) {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const groups = tree.map((n) => ({ node: n, pages: n.children?.length ? n.children : [n] }));
  const activeGroup = groups.find((g) => g.pages.some((p) => p.path === pathname)) ?? groups[0];

  return (
    <>
      <nav className="h-screen flex w-(--shell-rail-w) shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border bg-chrome py-2">
        {groups.map((g) => {
          const active = g === activeGroup;
          const first = g.pages[0];
          return (
            <button
              key={g.node.id}
              onClick={() => first?.path && nav({ to: first.path })}
              className={cn(
                'flex h-[var(--nav-item-h)] w-[calc(52px*var(--app-scale))] flex-col items-center justify-center gap-0.5 rounded-8',
                active
                  ? 'border border-(--nav-item-border-current) bg-(--nav-item-bg-current) text-(--nav-item-fg-current) shadow-(--nav-item-shadow-current)'
                  : 'text-text-3 hover:bg-(--nav-item-bg-hover)',
              )}
            >
              <Icon name={g.node.icon} className="size-[var(--nav-icon-size)]" />
              <span className="text-center text-[calc(11px*var(--app-scale))] leading-none">
                {lv(g.node.shortLabel ?? g.node.label, i18n.language)}
              </span>
            </button>
          );
        })}
      </nav>
      <aside className="h-screen flex w-(--shell-rail-panel-w) shrink-0 flex-col overflow-y-auto border-r border-border bg-chrome py-3 max-lg:hidden">
        <div className="px-4 pb-2 text-[calc(14px*var(--app-scale))] font-semibold text-text">
          {activeGroup ? lv(activeGroup.node.label, i18n.language) : ''}
        </div>
        <div className="px-2">
          {activeGroup?.pages.map((p) =>
            p.path ? (
              <Link
                key={p.id}
                to={p.path}
                className={cn(
                  'my-0.5 flex h-[var(--nav-subitem-h)] items-center rounded-8 px-3 text-sm',
                  pathname === p.path
                    ? 'border border-(--nav-item-border-current) bg-(--nav-item-bg-current) font-semibold text-(--nav-item-fg-current) shadow-(--nav-item-shadow-current)'
                    : 'text-text-2 hover:bg-(--nav-item-bg-hover)',
                )}
              >
                <span className="truncate">{lv(p.label, i18n.language)}</span>
              </Link>
            ) : null,
          )}
        </div>
      </aside>
    </>
  );
}
