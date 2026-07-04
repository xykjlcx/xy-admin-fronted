import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  [
    'w-full min-w-0 rounded-md border border-input bg-surface px-3 text-sm text-text shadow-card-sm outline-none transition-[border-color,box-shadow,background,color]',
    'placeholder:text-text-3 hover:border-control-border focus-visible:border-pri focus-visible:ring-[calc(3px*var(--app-scale))] focus-visible:ring-soft',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-50',
    'read-only:bg-surface-2 aria-invalid:border-danger aria-invalid:ring-danger-bg',
  ].join(' '),
  {
    variants: {
      inputSize: {
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
      inputSize: 'md',
      status: 'default',
    },
  },
);

type InputProps = React.ComponentProps<'input'> &
  VariantProps<typeof inputVariants> & {
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    addonBefore?: React.ReactNode;
  };

function Input({
  className,
  type,
  inputSize,
  status,
  prefix,
  suffix,
  addonBefore,
  disabled,
  'aria-invalid': ariaInvalid,
  ...props
}: InputProps) {
  if (prefix || suffix || addonBefore) {
    return (
      <InputGroup inputSize={inputSize} status={status} data-disabled={disabled || undefined}>
        {addonBefore && <InputGroupAddon>{addonBefore}</InputGroupAddon>}
        {prefix && <InputGroupPrefix>{prefix}</InputGroupPrefix>}
        <InputGroupInput
          type={type}
          disabled={disabled}
          aria-invalid={ariaInvalid ?? (status === 'error' || undefined)}
          className={className}
          {...props}
        />
        {suffix && <InputGroupSuffix>{suffix}</InputGroupSuffix>}
      </InputGroup>
    );
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputVariants({ inputSize, status }),
        className,
      )}
      disabled={disabled}
      aria-invalid={ariaInvalid ?? (status === 'error' || undefined)}
      {...props}
    />
  );
}

function InputGroup({
  className,
  inputSize = 'md',
  status = 'default',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputVariants>) {
  return (
    <div
      data-slot="input-group"
      data-size={inputSize}
      data-status={status}
      className={cn(
        'flex w-full min-w-0 items-center gap-2 rounded-md border border-input bg-surface px-3 text-sm text-text shadow-card-sm transition-[border-color,box-shadow,background,color]',
        'hover:border-control-border focus-within:border-pri focus-within:ring-[calc(3px*var(--app-scale))] focus-within:ring-soft',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:bg-surface-2 data-[disabled=true]:opacity-50',
        inputSize === 'sm' && 'h-[var(--control-sm)] text-[calc(13px*var(--app-scale))]',
        inputSize === 'md' && 'h-[var(--control-md)] text-sm',
        inputSize === 'lg' && 'h-[var(--control-lg)] text-[calc(15px*var(--app-scale))]',
        status === 'error' && 'border-danger focus-within:ring-danger-bg',
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input-group-input"
      className={cn(
        'min-w-0 flex-1 border-0 bg-transparent p-0 outline-none placeholder:text-text-3 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  );
}

function InputGroupAddon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="input-group-addon"
      className={cn(
        '-ml-3 self-stretch border-r border-border bg-surface-2 px-3 text-text-3 inline-flex items-center',
        className,
      )}
      {...props}
    />
  );
}

function InputGroupPrefix({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="input-group-prefix" className={cn('inline-flex shrink-0 text-text-3', className)} {...props} />;
}

function InputGroupSuffix({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="input-group-suffix" className={cn('inline-flex shrink-0 text-text-3', className)} {...props} />;
}

export { Input, InputGroup, InputGroupAddon, InputGroupInput, InputGroupPrefix, InputGroupSuffix, inputVariants };
