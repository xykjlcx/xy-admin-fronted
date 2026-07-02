import { useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lv } from '@/lib/localized';
import { Icon } from '@/lib/icon-registry';
import type { MenuNode } from '@/lib/menu-tree';

// 侧栏两级树（原型 LAYOUT A）：dir 可折叠（grid 0fr↔1fr .26s），menu 行是路由 Link，激活项 bg-pri-soft/text-pri。
// collapsed（整栏收起）由布局下发；各 dir 的展开态是本地状态（不持久化）。
export function NavMenuSidebar({
  tree,
  collapsed,
  onToggle,
}: {
  tree: MenuNode[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const [collapsedDirs, setCollapsedDirs] = useState<Record<string, boolean>>({});
  const toggleDir = (id: string) => setCollapsedDirs((s) => ({ ...s, [id]: !s[id] }));

  const leafClass = (active: boolean) =>
    cn(
      'mx-2 flex h-[38px] items-center rounded-md pl-11 pr-3 text-sm',
      active ? 'bg-pri-soft font-semibold text-pri' : 'text-text-2 hover:bg-surface-2',
    );

  return (
    <>
      <nav className="flex-1 overflow-y-auto py-2">
        {tree.map((node) => {
          const isLeaf = node.type === 'menu' && (!node.children || node.children.length === 0);

          // 顶级叶子菜单（无分组）：渲染成带图标的直达链接
          if (isLeaf && node.path) {
            const active = pathname === node.path;
            return (
              <Link
                key={node.id}
                to={node.path}
                className={cn(
                  'mx-2 mb-0.5 flex h-[42px] items-center gap-2.5 rounded-md px-4 text-sm font-medium',
                  active ? 'bg-pri-soft text-pri' : 'text-text-2 hover:bg-bg',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? lv(node.label, i18n.language) : undefined}
              >
                <Icon name={node.icon} className="size-[18px] shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{lv(node.label, i18n.language)}</span>}
              </Link>
            );
          }

          const expanded = !collapsedDirs[node.id];
          return (
            <div key={node.id} className="mb-0.5">
              <button
                onClick={() => toggleDir(node.id)}
                className={cn(
                  'mx-2 flex h-[42px] w-[calc(100%-16px)] items-center gap-2.5 rounded-md px-4 text-sm font-medium text-text-2 hover:bg-bg',
                  collapsed && 'justify-center px-0',
                )}
                title={collapsed ? lv(node.label, i18n.language) : undefined}
              >
                <Icon name={node.icon} className="size-[18px] shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate text-left">{lv(node.label, i18n.language)}</span>
                    <ChevronDown
                      className={cn(
                        'size-3.5 shrink-0 text-text-3 transition-transform duration-200',
                        !expanded && '-rotate-90',
                      )}
                    />
                  </>
                )}
              </button>
              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                  expanded && !collapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  {node.children?.map((child) =>
                    child.path ? (
                      <Link
                        key={child.id}
                        to={child.path}
                        className={leafClass(pathname === child.path)}
                      >
                        <span className="truncate">{lv(child.label, i18n.language)}</span>
                      </Link>
                    ) : null,
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </nav>
      <button
        onClick={onToggle}
        className="flex h-11 shrink-0 items-center gap-2.5 border-t border-border px-5 text-[13px] text-text-3 hover:text-pri"
      >
        <Menu className="size-[18px] shrink-0" />
        {!collapsed && <span>{t('shell.nav.collapse')}</span>}
      </button>
    </>
  );
}
