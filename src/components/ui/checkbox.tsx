import * as React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange'> {
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Checkbox({
  className,
  checked,
  indeterminate = false,
  disabled,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <span
      data-slot="checkbox"
      data-checked={checked || indeterminate || undefined}
      data-disabled={disabled || undefined}
      className={cn('relative inline-flex size-[calc(18px*var(--app-scale))] shrink-0 items-center justify-center', className)}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
        className={cn(
          'peer size-full cursor-pointer appearance-none rounded-5 border-[calc(1.5px*var(--app-scale))] border-(--choice-border) bg-(--choice-bg) outline-none transition-colors',
          'hover:border-(--choice-border-hover) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--choice-ring)',
          'checked:border-(--choice-border-checked) checked:bg-(--choice-bg-checked) disabled:cursor-not-allowed disabled:bg-(--choice-bg-disabled) disabled:opacity-50',
          indeterminate && 'border-(--choice-border-indeterminate) bg-(--choice-bg-indeterminate)',
        )}
        {...props}
      />
      {(checked || indeterminate) && (
        <span className={cn('pointer-events-none absolute inline-flex peer-disabled:opacity-50', indeterminate ? 'text-(--choice-fg-indeterminate)' : 'text-(--choice-fg-checked)')}>
          {indeterminate ? (
            <Minus data-slot="checkbox-indicator" className="size-[calc(12px*var(--app-scale))] stroke-[3px]" />
          ) : (
            <Check data-slot="checkbox-indicator" className="size-[calc(12px*var(--app-scale))] stroke-[3px]" />
          )}
        </span>
      )}
    </span>
  );
}

export { Checkbox };
