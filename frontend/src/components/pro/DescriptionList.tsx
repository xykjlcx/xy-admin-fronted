import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DescriptionListItem {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function DescriptionList({
  items,
  columns = 1,
  density = 'default',
  presentation = 'plain',
  empty,
}: {
  items: DescriptionListItem[];
  columns?: 1 | 2;
  density?: 'default' | 'compact';
  presentation?: 'plain' | 'cards';
  empty?: ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div
        data-slot="description-list-empty"
        data-presentation={presentation}
        className={cn(
          'py-6 text-center text-sm text-text-3',
          presentation === 'cards' &&
            'mt-3 rounded-10 border border-(--page-section-divider) bg-(--pro-panel-bg) px-3',
        )}
      >
        {empty}
      </div>
    );
  }

  return (
    <dl
      data-slot="description-list"
      data-density={density}
      data-presentation={presentation}
      className={cn(
        'grid text-sm',
        presentation === 'plain' && (density === 'default' ? 'mt-6 gap-4' : 'mt-2 gap-x-6 gap-y-1'),
        presentation === 'cards' && 'mt-3 gap-1.5',
        presentation === 'plain' && columns === 2 && 'sm:grid-cols-2',
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          data-slot="description-list-item"
          className={cn(
            presentation === 'plain' && density === 'compact' && 'min-h-12 py-1',
            presentation === 'cards' &&
              'flex min-h-[calc(58px*var(--app-scale))] items-center justify-between gap-3 rounded-10 border border-(--page-section-divider) bg-(--pro-panel-bg) px-3 py-2.5 shadow-card-sm',
          )}
        >
          <div className="min-w-0">
            <dt className="truncate text-text-3">{item.label}</dt>
            <dd className="mt-1 truncate text-text">{item.value}</dd>
            {item.description && <dd className="mt-1 text-text-2">{item.description}</dd>}
          </div>
          {item.actions ? (
            <div
              data-slot="description-list-actions"
              className="flex shrink-0 items-center gap-1.5"
            >
              {item.actions}
            </div>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
