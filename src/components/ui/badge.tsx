import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1 rounded-5 px-2 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      neutral: 'bg-surface-2 text-text-3',
      primary: 'bg-pri-soft text-pri',
      success: 'bg-success-bg text-success',
      warning: 'bg-warning-bg text-warning',
      danger: 'bg-danger-bg text-danger',
      purple: 'bg-purple-bg text-purple',
      teal: 'bg-teal-bg text-teal',
    },
  },
  defaultVariants: {
    variant: 'neutral',
  },
});

export interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotTestId?: string;
}

function Badge({ className, variant, dot = false, dotTestId, children, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span data-slot="badge-dot" data-testid={dotTestId} className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
