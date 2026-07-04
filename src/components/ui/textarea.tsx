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
          'flex min-h-[calc(88px*var(--app-scale))] w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-text shadow-card-sm outline-none transition-[background,border-color,box-shadow,color]',
          'placeholder:text-text-3 hover:border-control-border focus-visible:border-pri focus-visible:ring-[calc(3px*var(--app-scale))] focus-visible:ring-soft',
          'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-danger-bg',
          resize === 'none' && 'resize-none',
          resize === 'vertical' && 'resize-y',
          resize === 'both' && 'resize',
          status === 'error' && 'border-danger focus-visible:ring-danger-bg',
        ],
        className,
      )}
      aria-invalid={ariaInvalid ?? (status === 'error' || undefined)}
      {...props}
    />
  );
}

export { Textarea };
