import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const nativeSelectVariants = cva(
  [
    'w-full min-w-0 rounded-md border border-input bg-surface px-3 text-sm text-text shadow-card-sm outline-none transition-[border-color,box-shadow,background,color]',
    'hover:border-control-border focus-visible:border-pri focus-visible:ring-[calc(3px*var(--app-scale))] focus-visible:ring-soft',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-50',
    'aria-invalid:border-danger aria-invalid:ring-danger-bg',
  ].join(' '),
  {
    variants: {
      selectSize: {
        sm: 'h-[var(--control-sm)] text-[calc(13px*var(--app-scale))]',
        md: 'h-[var(--control-md)] text-sm',
        lg: 'h-[var(--control-lg)] text-[calc(15px*var(--app-scale))]',
      },
      status: {
        default: '',
        error: 'border-danger focus-visible:ring-danger-bg',
      },
    },
    defaultVariants: {
      selectSize: 'md',
      status: 'default',
    },
  },
);

export function NativeSelect({
  className,
  selectSize,
  status,
  'aria-invalid': ariaInvalid,
  ...props
}: ComponentProps<'select'> & VariantProps<typeof nativeSelectVariants>) {
  return (
    <select
      data-slot="native-select"
      className={cn(nativeSelectVariants({ selectSize, status }), className)}
      aria-invalid={ariaInvalid ?? (status === 'error' || undefined)}
      {...props}
    />
  );
}

export { nativeSelectVariants };
