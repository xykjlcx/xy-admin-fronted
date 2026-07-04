import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  value: number;
  max?: number;
}

function ProgressBar({ value, max = 100, className, ...props }: ProgressBarProps) {
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (normalizedValue / max) * 100 : 0;

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={normalizedValue}
      className={cn('h-1.5 overflow-hidden rounded-full bg-surface-2', className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full rounded-full bg-pri transition-[width] duration-200 ease-out motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export { ProgressBar };
