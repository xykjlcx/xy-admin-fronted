import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap border border-transparent font-[var(--button-font-weight)] [text-transform:var(--button-transform)] [letter-spacing:var(--button-tracking)] outline-none transition-[background,border-color,color,box-shadow,opacity]',
    'focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--button-ring)',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 data-[loading=true]:pointer-events-none data-[loading=true]:cursor-wait data-[loading=true]:opacity-80',
    '[&_[data-icon]]:pointer-events-none [&_[data-icon]]:shrink-0 [&_[data-icon]]:size-[calc(15px*var(--app-scale))]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-(--button-primary-bg) text-(--button-primary-fg) hover:bg-(--button-primary-bg-hover) active:bg-(--button-primary-bg-active)',
        default: 'bg-(--button-primary-bg) text-(--button-primary-fg) hover:bg-(--button-primary-bg-hover) active:bg-(--button-primary-bg-active)',
        secondary:
          'border-(--button-secondary-border) bg-(--button-secondary-bg) text-(--button-secondary-fg) shadow-(--button-secondary-shadow) hover:border-(--button-secondary-border-hover) hover:bg-(--button-secondary-bg-hover) hover:text-(--button-secondary-fg-hover) active:bg-(--button-secondary-bg-active)',
        outline:
          'border-(--button-secondary-border) bg-(--button-secondary-bg) text-(--button-secondary-fg) shadow-(--button-secondary-shadow) hover:border-(--button-secondary-border-hover) hover:bg-(--button-secondary-bg-hover) hover:text-(--button-secondary-fg-hover) active:bg-(--button-secondary-bg-active)',
        dashed:
          'border-dashed border-(--button-dashed-border) bg-(--button-secondary-bg) text-(--button-dashed-fg) hover:border-(--button-dashed-border-hover) hover:text-(--button-dashed-fg-hover) active:bg-(--button-secondary-bg-active)',
        text: 'bg-transparent text-(--button-text-fg) hover:bg-(--button-text-bg-hover) active:bg-(--button-text-bg-hover)',
        ghost:
          'bg-transparent text-(--button-ghost-fg) hover:bg-(--button-ghost-bg-hover) hover:text-(--button-ghost-fg-hover) active:bg-(--button-ghost-bg-hover)',
        link: 'bg-transparent px-0 text-(--button-link-fg) hover:bg-transparent hover:underline',
        danger: 'bg-(--button-danger-bg) text-(--button-danger-fg) hover:bg-(--button-danger-bg-hover) focus-visible:ring-(--button-danger-ring)',
        destructive: 'bg-(--button-danger-bg) text-(--button-danger-fg) hover:bg-(--button-danger-bg-hover) focus-visible:ring-(--button-danger-ring)',
        'danger-ghost':
          'border-(--button-danger-ghost-border) bg-(--button-danger-ghost-bg) text-(--button-danger-ghost-fg) hover:bg-(--button-danger-ghost-bg) focus-visible:ring-(--button-danger-ring)',
      },
      size: {
        default: 'h-[var(--control-btn-md)] rounded-md px-[calc(18px*var(--app-scale))] text-sm',
        md: 'h-[var(--control-btn-md)] rounded-md px-[calc(18px*var(--app-scale))] text-sm',
        xs: 'h-[calc(24px*var(--app-scale))] gap-1 rounded-6 px-2 text-xs [&_[data-icon]]:size-[calc(13px*var(--app-scale))]',
        sm: 'h-[var(--control-sm)] gap-1.5 rounded-sm px-3 text-[calc(13px*var(--app-scale))]',
        lg: 'h-[var(--control-lg)] rounded-md px-[calc(22px*var(--app-scale))] text-[calc(15px*var(--app-scale))]',
        icon: 'size-[var(--control-btn-md)] rounded-9 px-0',
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
  const isIconButton = typeof size === 'string' && size.startsWith('icon') && variant === 'ghost';
  const iconButtonClassName =
    'text-(--button-icon-fg) hover:bg-(--button-icon-bg-hover) hover:text-(--button-icon-fg-hover)';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={isDisabled}
      className={cn(buttonVariants({ variant, size }), isIconButton && iconButtonClassName, block && 'w-full', className)}
      {...props}
    >
      {loading && <ButtonSpinner aria-hidden="true" />}
      {children}
    </Comp>
  );
}

export { Button, ButtonSpinner, buttonVariants };
