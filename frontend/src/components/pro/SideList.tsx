import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SideListItem {
  id: string;
  label: ReactNode;
  ariaLabel?: string;
  meta?: ReactNode;
  icon?: ReactNode;
  depth?: number;
}

export interface SideCardListItem {
  id: string;
  label: ReactNode;
  ariaLabel: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function SideList({
  items,
  activeId,
  onSelect,
  search,
  className,
}: {
  items: SideListItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  search?: ReactNode;
  className?: string;
}) {
  return (
    <aside className={cn('w-[calc(248px*var(--app-scale))] shrink-0 border-r border-(--page-pane-divider) bg-(--side-list-bg) px-3 py-4', className)}>
      {search && <div className="mb-3">{search}</div>}
      {items.map((item) => (
        <Button
          key={item.id}
          type="button"
          variant="ghost"
          className={cn(
            'mb-px h-9 w-full justify-start gap-2 rounded-8 pr-3 text-left text-sm',
            item.id === activeId
              ? 'bg-(--side-list-item-bg-active) font-semibold text-(--side-list-item-fg-active) hover:bg-(--side-list-item-bg-active)'
              : 'text-text-2 hover:bg-(--side-list-item-bg-hover)',
          )}
          style={{ paddingLeft: `calc(${12 + (item.depth ?? 0) * 18}px * var(--app-scale))` }}
          onClick={() => onSelect(item.id)}
          aria-label={item.ariaLabel ?? `${item.label ?? ''} ${item.meta ?? ''}`.trim()}
        >
          {item.icon}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.meta && (
            <span className={cn('text-xs text-text-3', item.id === activeId && 'text-(--side-list-item-meta-fg-active)')}>
              {item.meta}
            </span>
          )}
        </Button>
      ))}
    </aside>
  );
}

export function SideCardList({
  items,
  activeId,
  onSelect,
}: {
  items: SideCardListItem[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div data-slot="side-card-list" className="grid gap-1.5">
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <div
            key={item.id}
            data-slot="side-card"
            data-state={active ? 'active' : 'inactive'}
            className={cn(
              'group/side-card relative rounded-10 border',
              active
                ? 'border-(--nav-item-border-current) bg-(--nav-item-bg-current)'
                : 'border-transparent hover:border-(--page-section-divider) hover:bg-(--side-list-item-bg-hover)',
            )}
          >
            <button
              type="button"
              aria-label={item.ariaLabel}
              aria-current={active ? 'page' : undefined}
              className="flex min-h-[calc(60px*var(--app-scale))] w-full items-center gap-2.5 rounded-10 px-3 py-2 pr-9 text-left outline-none focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)"
              onClick={() => onSelect(item.id)}
            >
              {item.icon ? (
                <span
                  data-slot="side-card-icon"
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-8',
                    active
                      ? 'bg-(--pro-panel-bg) text-(--nav-item-fg-current)'
                      : 'bg-(--nav-item-bg-current) text-(--nav-item-fg-current)',
                  )}
                >
                  {item.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-sm font-semibold',
                    active ? 'text-(--nav-item-fg-current)' : 'text-text',
                  )}
                >
                  {item.label}
                </span>
                {item.description ? (
                  <span className="mt-1 block truncate text-xs text-text-3">{item.description}</span>
                ) : null}
              </span>
            </button>
            {item.action ? (
              <span
                data-slot="side-card-action"
                className="absolute top-1/2 right-2 -translate-y-1/2"
              >
                {item.action}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
