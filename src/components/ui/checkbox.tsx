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
        data-indeterminate={indeterminate || undefined}
        onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
        className={cn(
          'peer ui-choice size-full cursor-pointer appearance-none rounded-5 border-[calc(1.5px*var(--app-scale))] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
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
