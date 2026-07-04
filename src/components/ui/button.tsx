import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border border-transparent font-medium outline-none transition-[background,border-color,color,box-shadow,opacity]',
    'focus-visible:ring-[calc(3px*var(--app-scale))] focus-visible:ring-soft',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 data-[loading=true]:pointer-events-none data-[loading=true]:cursor-wait data-[loading=true]:opacity-80',
    '[&_[data-icon]]:pointer-events-none [&_[data-icon]]:shrink-0 [&_[data-icon]]:size-[calc(15px*var(--app-scale))]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-pri text-on-pri hover:bg-pri-hover active:bg-pri-active',
        default: 'bg-pri text-on-pri hover:bg-pri-hover active:bg-pri-active',
        secondary: 'border-border bg-surface text-text shadow-card-sm hover:border-pri hover:text-pri active:bg-surface-2',
        outline: 'border-border bg-surface text-text shadow-card-sm hover:border-pri hover:text-pri active:bg-surface-2',
        dashed: 'border-dashed border-line-strong bg-surface text-text-2 hover:border-pri hover:text-pri active:bg-surface-2',
        text: 'bg-transparent text-pri hover:bg-pri-soft active:bg-pri-soft',
        ghost: 'bg-transparent text-text-2 hover:bg-surface-2 hover:text-text active:bg-surface-2',
        link: 'bg-transparent px-0 text-pri hover:bg-transparent hover:underline',
        danger: 'bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger-bg',
        destructive: 'bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger-bg',
        'danger-ghost': 'border-danger bg-danger-bg text-danger hover:bg-danger-bg focus-visible:ring-danger-bg',
      },
      size: {
        default: 'h-[var(--control-md)] rounded-md px-[calc(18px*var(--app-scale))] text-sm',
        md: 'h-[var(--control-md)] rounded-md px-[calc(18px*var(--app-scale))] text-sm',
        xs: 'h-[calc(24px*var(--app-scale))] gap-1 rounded-6 px-2 text-xs [&_[data-icon]]:size-[calc(13px*var(--app-scale))]',
        sm: 'h-[var(--control-sm)] gap-1.5 rounded-sm px-3 text-[calc(13px*var(--app-scale))]',
        lg: 'h-[var(--control-lg)] rounded-md px-[calc(22px*var(--app-scale))] text-[calc(15px*var(--app-scale))]',
        icon: 'size-[var(--control-md)] rounded-9 px-0',
        'icon-xs': 'size-[calc(24px*var(--app-scale))] rounded-6 px-0 [&_[data-icon]]:size-[calc(13px*var(--app-scale))]',
        'icon-sm': 'size-[var(--control-sm)] rounded-sm px-0',
        'icon-lg': 'size-[var(--control-lg)] rounded-md px-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

function ButtonSpinner({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="button-spinner"
      data-icon="inline-start"
      className={cn(
        'inline-block size-[calc(14px*var(--app-scale))] animate-spin rounded-full border-[calc(2px*var(--app-scale))] border-current border-t-transparent opacity-80',
        className,
      )}
      {...props}
    />
  );
}

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    block?: boolean;
    loading?: boolean;
  };

function Button({
  className,
  variant = 'primary',
  size = 'md',
  asChild = false,
  block = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  const isDisabled = disabled || loading;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={isDisabled}
      className={cn(buttonVariants({ variant, size }), block && 'w-full', className)}
      {...props}
    >
      {loading && <ButtonSpinner aria-hidden="true" />}
      {children}
    </Comp>
  );
}

export { Button, ButtonSpinner, buttonVariants };
