import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  [
    'ui-field w-full min-w-0 rounded-md border px-(--field-px) outline-none transition-[border-color,box-shadow,background,color]',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
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
        error: '',
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
      <InputGroup
        inputSize={inputSize}
        status={status}
        data-addon-before={addonBefore ? true : undefined}
        data-disabled={disabled || undefined}
      >
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
        'ui-field flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-md border px-(--field-px) transition-[border-color,box-shadow,background,color]',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50',
        'data-[addon-before=true]:pl-0',
        inputSize === 'sm' && 'h-[var(--control-sm)] text-[calc(13px*var(--app-scale))]',
        inputSize === 'md' && 'h-[var(--control-md)] text-sm',
        inputSize === 'lg' && 'h-[var(--control-lg)] text-[calc(15px*var(--app-scale))]',
        className,
      )}
      {...props}
    />
  );
}

const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  function InputGroupInput({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        data-slot="input-group-input"
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent p-0 outline-none disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    );
  },
);

function InputGroupAddon({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="input-group-addon"
      className={cn(
        'inline-flex self-stretch items-center border-r px-(--field-px)',
        className,
      )}
      {...props}
    />
  );
}

function InputGroupPrefix({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="input-group-prefix" className={cn('inline-flex shrink-0', className)} {...props} />;
}

function InputGroupSuffix({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="input-group-suffix" className={cn('inline-flex shrink-0', className)} {...props} />;
}

export { Input, InputGroup, InputGroupAddon, InputGroupInput, InputGroupPrefix, InputGroupSuffix, inputVariants };
