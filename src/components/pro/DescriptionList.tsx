import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DescriptionListItem {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
}

export function DescriptionList({
  items,
  columns = 1,
  density = 'default',
  empty,
}: {
  items: DescriptionListItem[];
  columns?: 1 | 2;
  density?: 'default' | 'compact';
  empty?: ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div data-slot="description-list-empty" className="py-6 text-center text-sm text-text-3">
        {empty}
      </div>
    );
  }

  return (
    <dl
      data-density={density}
      className={cn(
        'grid text-sm',
        density === 'default' ? 'mt-6 gap-4' : 'mt-2 gap-x-6 gap-y-1',
        columns === 2 && 'sm:grid-cols-2',
      )}
    >
      {items.map((item, index) => (
        <div key={index} className={cn(density === 'compact' && 'min-h-12 py-1')}>
          <dt className="text-text-3">{item.label}</dt>
          <dd className="mt-1 text-text">{item.value}</dd>
          {item.description && <dd className="mt-1 text-text-2">{item.description}</dd>}
        </div>
      ))}
    </dl>
  );
}
