import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-(--badge-radius) bg-(--badge-bg) px-(--badge-px) py-(--badge-py) text-(length:--badge-font-size) font-[var(--badge-font-weight)] text-(--badge-fg)',
  {
    variants: {
      variant: {
        neutral: '[--badge-bg:var(--badge-neutral-bg)] [--badge-fg:var(--badge-neutral-fg)]',
        primary: '[--badge-bg:var(--badge-primary-bg)] [--badge-fg:var(--badge-primary-fg)]',
        success: '[--badge-bg:var(--badge-success-bg)] [--badge-fg:var(--badge-success-fg)]',
        warning: '[--badge-bg:var(--badge-warning-bg)] [--badge-fg:var(--badge-warning-fg)]',
        danger: '[--badge-bg:var(--badge-danger-bg)] [--badge-fg:var(--badge-danger-fg)]',
        purple: '[--badge-bg:var(--badge-purple-bg)] [--badge-fg:var(--badge-purple-fg)]',
        teal: '[--badge-bg:var(--badge-teal-bg)] [--badge-fg:var(--badge-teal-fg)]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  },
);

export interface BadgeProps extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotTestId?: string;
}

function Badge({ className, variant, dot = false, dotTestId, children, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {dot && (
        <span data-slot="badge-dot" data-testid={dotTestId} className="size-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
