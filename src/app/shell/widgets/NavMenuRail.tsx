import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import { Icon } from '@/lib/icon-registry';
import type { MenuNode } from '@/lib/menu-tree';

// Rail 导航（原型 L222-241）：76px 图标栏（每个顶级组一个图标+短名）+ 192px 二级面板（当前组的页面平铺）。
// 顶级 dir = 一组，其 children = 页面；顶级 leaf 自成一组（页面即自身）。当前组 = 含当前路由的组。
export function NavMenuRail({ tree }: { tree: MenuNode[] }) {
  const { i18n } = useTranslation();
  const { pathname } = useLocation();
  const nav = useNavigate();
  const groups = tree.map((n) => ({ node: n, pages: n.children?.length ? n.children : [n] }));
  const activeGroup = groups.find((g) => g.pages.some((p) => p.path === pathname)) ?? groups[0];

  return (
    <>
      <nav className="h-screen flex w-[calc(76px*var(--app-scale))] shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border bg-chrome py-2.5">
        {groups.map((g) => {
          const active = g === activeGroup;
          const first = g.pages[0];
          return (
            <button
              key={g.node.id}
              onClick={() => first?.path && nav({ to: first.path })}
              className={cn(
                'flex w-[calc(60px*var(--app-scale))] flex-col items-center gap-[calc(5px*var(--app-scale))] rounded-10 py-2.5',
                active ? 'bg-pri-soft text-pri' : 'text-text-3 hover:bg-bg',
              )}
            >
              <Icon name={g.node.icon} className="size-5" />
              <span className="text-center text-[calc(11px*var(--app-scale))] leading-none">
                {lv(g.node.shortLabel ?? g.node.label, i18n.language)}
              </span>
            </button>
          );
        })}
      </nav>
      <aside className="h-screen flex w-[calc(192px*var(--app-scale))] shrink-0 flex-col overflow-y-auto border-r border-border bg-chrome py-4">
        <div className="px-5 pb-3 text-[calc(15px*var(--app-scale))] font-bold text-text">
          {activeGroup ? lv(activeGroup.node.label, i18n.language) : ''}
        </div>
        <div className="px-2">
          {activeGroup?.pages.map((p) =>
            p.path ? (
              <Link
                key={p.id}
                to={p.path}
                className={cn(
                  'my-0.5 flex h-[calc(38px*var(--app-scale))] items-center rounded-8 px-3.5 text-sm',
                  pathname === p.path
                    ? 'bg-pri-soft font-semibold text-pri'
                    : 'text-text-2 hover:bg-surface-2',
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
