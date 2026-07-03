import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GridSlotProps {
  gridTemplateColumns: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface TableShellProps {
  header: ReactNode;
  children?: ReactNode;
  empty?: ReactNode;
  pagination?: ReactNode;
  selectedBar?: ReactNode;
  className?: string;
}

function withGridTemplate(gridTemplateColumns: string, style?: CSSProperties): CSSProperties {
  return { ...style, gridTemplateColumns };
}

export function TableShell({ header, children, empty, pagination, selectedBar, className }: TableShellProps) {
  return (
    <>
      <div className={cn('overflow-hidden rounded-10 border border-border bg-surface', className)}>
        {header}
        {children ?? (
          <div className="flex h-36 items-center justify-center border-t border-border text-sm text-text-3">
            {empty}
          </div>
        )}
      </div>
      {selectedBar}
      {pagination}
    </>
  );
}

export function TableShellHeader({ gridTemplateColumns, children, className, style }: GridSlotProps) {
  return (
    <div
      className={cn(
        'grid h-11 items-center bg-surface-2 px-2 text-[calc(13px*var(--app-scale))] font-medium text-text-3',
        className,
      )}
      style={withGridTemplate(gridTemplateColumns, style)}
    >
      {children}
    </div>
  );
}

export function TableShellRow({ gridTemplateColumns, children, className, style }: GridSlotProps) {
  return (
    <div
      className={cn('grid h-14 items-center border-t border-border px-2 hover:bg-surface-2', className)}
      style={withGridTemplate(gridTemplateColumns, style)}
    >
      {children}
    </div>
  );
}
