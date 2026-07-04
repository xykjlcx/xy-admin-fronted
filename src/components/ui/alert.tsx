import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  [
    'relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-10 border px-4 py-3 text-sm shadow-card-sm',
    'has-[>svg]:grid-cols-[calc(18px*var(--app-scale))_1fr] has-[>svg]:gap-x-3 [&>svg]:mt-[calc(2px*var(--app-scale))] [&>svg]:size-[calc(16px*var(--app-scale))] [&>svg]:text-current',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'border-border bg-surface text-text',
        info: 'border-info/30 bg-info-bg text-text [&>svg]:text-info',
        success: 'border-success/30 bg-success-bg text-text [&>svg]:text-success',
        warning: 'border-warning/30 bg-warning-bg text-text [&>svg]:text-warning',
        destructive: 'border-danger/30 bg-danger-bg text-danger *:data-[slot=alert-description]:text-danger [&>svg]:text-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        'col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight',
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'col-start-2 grid justify-items-start gap-1 text-sm text-text-3 [&_p]:leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
