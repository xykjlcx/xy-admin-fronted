import { Check } from 'lucide-react';
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

export interface TableCheckboxProps {
  ariaLabel: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
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

export function TableCheckbox({ ariaLabel, checked, onCheckedChange, className }: TableCheckboxProps) {
  return (
    <span className={cn('relative flex size-[calc(16px*var(--app-scale))] shrink-0 items-center justify-center', className)}>
      <input
        type="checkbox"
        aria-label={ariaLabel}
        checked={checked}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        className={cn(
          'peer size-full appearance-none rounded-4 border-solid outline-none transition-colors',
          'hover:border-pri focus-visible:ring-[calc(2px*var(--app-scale))] focus-visible:ring-ring/45',
          className,
        )}
        style={{
          backgroundColor: checked ? 'var(--pri)' : 'var(--surface)',
          borderColor: checked ? 'var(--pri)' : 'var(--control-border)',
          borderWidth: 'calc(1.5px * var(--app-scale))',
        }}
      />
      {checked && (
        <Check
          data-testid="table-checkbox-check"
          className="pointer-events-none absolute size-[calc(12px*var(--app-scale))] stroke-[3px] text-white"
        />
      )}
    </span>
  );
}
