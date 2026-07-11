import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const nativeSelectVariants = cva(
  [
    'ui-field w-full min-w-0 cursor-pointer rounded-md border px-(--field-px) text-sm outline-none transition-[border-color,box-shadow,background,color]',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
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
        error: '',
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
