import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SideListItem {
  id: string;
  label: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  depth?: number;
}

export function SideList({
  items,
  activeId,
  onSelect,
  search,
}: {
  items: SideListItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  search?: ReactNode;
}) {
  return (
    <aside className="w-[calc(248px*var(--app-scale))] shrink-0 border-r border-(--side-list-border) bg-(--side-list-bg) px-3 py-4">
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
          aria-label={`${item.label ?? ''} ${item.meta ?? ''}`.trim()}
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
