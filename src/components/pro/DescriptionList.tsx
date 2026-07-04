import type { ReactNode } from 'react';

export interface DescriptionListItem {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
}

export function DescriptionList({ items }: { items: DescriptionListItem[] }) {
  return (
    <dl className="mt-6 grid gap-4 text-sm">
      {items.map((item, index) => (
        <div key={index}>
          <dt className="text-text-3">{item.label}</dt>
          <dd className="mt-1 text-text">{item.value}</dd>
          {item.description && <dd className="mt-1 text-text-2">{item.description}</dd>}
        </div>
      ))}
    </dl>
  );
}
