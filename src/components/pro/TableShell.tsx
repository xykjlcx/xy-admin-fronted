import type { CSSProperties, ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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

export interface TableShellLoadingRowsProps {
  gridTemplateColumns: string;
  rows?: number;
  cells: number;
  ariaLabel: string;
}

export interface TableCheckboxProps {
  ariaLabel: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export interface TableTreeCellProps {
  depth: number;
  step?: number;
  children: ReactNode;
  className?: string;
}

function withGridTemplate(gridTemplateColumns: string, style?: CSSProperties): CSSProperties {
  return { ...style, gridTemplateColumns };
}

// TableShell 是后台列表页的公共骨架：表头、行、空态、批量操作条和分页都用同一套结构。
// 后续新列表页优先复用它，显示比例和边框/圆角规则才会跟随基础层统一演进。
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

export function TableShellLoadingRows({
  gridTemplateColumns,
  rows = 5,
  cells,
  ariaLabel,
}: TableShellLoadingRowsProps) {
  return (
    <div role="status" aria-label={ariaLabel}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          data-testid="table-loading-row"
          className="grid h-14 items-center border-t border-border px-2"
          style={{ gridTemplateColumns }}
        >
          {Array.from({ length: cells }).map((__, cellIndex) => (
            <div key={cellIndex} className="px-2">
              <Skeleton
                className={cn(
                  'h-3',
                  cellIndex === 0 && 'mx-auto w-4',
                  cellIndex === cells - 1 && 'w-16',
                  cellIndex > 0 && cellIndex < cells - 1 && 'w-3/4',
                )}
              />
            </div>
          ))}
        </div>
      ))}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

export function TableTreeCell({ depth, step = 20, children, className }: TableTreeCellProps) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      style={{ paddingLeft: `calc(${depth * step}px * var(--app-scale))` }}
    >
      {children}
    </div>
  );
}

export function TableCheckbox({ ariaLabel, checked, onCheckedChange, className }: TableCheckboxProps) {
  return (
    <Checkbox
      aria-label={ariaLabel}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn('size-[calc(16px*var(--app-scale))]', className)}
    />
  );
}
