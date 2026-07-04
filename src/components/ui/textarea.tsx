import * as React from 'react';

import { cn } from '@/lib/utils';

type TextareaProps = React.ComponentProps<'textarea'> & {
  status?: 'default' | 'error';
  resize?: 'none' | 'vertical' | 'both';
};

function Textarea({
  className,
  status = 'default',
  resize = 'vertical',
  'aria-invalid': ariaInvalid,
  ...props
}: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        [
          'ui-field flex min-h-[calc(88px*var(--app-scale))] w-full rounded-md border px-3 py-2 text-sm outline-none transition-[background,border-color,box-shadow,color]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          resize === 'none' && 'resize-none',
          resize === 'vertical' && 'resize-y',
          resize === 'both' && 'resize',
        ],
        className,
      )}
      aria-invalid={ariaInvalid ?? (status === 'error' || undefined)}
      {...props}
    />
  );
}

export { Textarea };
