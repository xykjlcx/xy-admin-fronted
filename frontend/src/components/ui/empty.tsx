import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function Empty({ icon, title, description, action, className }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn('flex min-h-[calc(144px*var(--app-scale))] flex-col items-center justify-center gap-2 text-center', className)}
    >
      {icon && <div className="mb-1 text-(--empty-fg)">{icon}</div>}
      <div className="text-sm font-medium text-text">{title}</div>
      {description && <div className="max-w-[calc(360px*var(--app-scale))] text-xs leading-5 text-(--empty-fg)">{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { Empty };
