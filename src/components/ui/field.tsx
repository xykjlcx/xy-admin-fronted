import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function FieldGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-3', className)} {...props} />;
}

export function Field({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="field" className={cn('grid gap-1.5 data-[invalid=true]:text-danger', className)} {...props} />;
}

export function FieldLabel({
  className,
  required,
  children,
  ...props
}: ComponentProps<'label'> & {
  required?: boolean;
}) {
  return (
    <label data-slot="field-label" className={cn('text-xs font-medium text-text-2', className)} {...props}>
      {required && <span aria-hidden="true" className="mr-1 text-danger">*</span>}
      {children}
    </label>
  );
}

export function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="field-description" className={cn('text-xs text-text-3', className)} {...props} />;
}

export function FieldError({ className, ...props }: ComponentProps<'p'>) {
  return <p data-slot="field-error" className={cn('text-xs text-danger', className)} {...props} />;
}

export function FieldSet({ className, ...props }: ComponentProps<'fieldset'>) {
  return <fieldset data-slot="field-set" className={cn('grid gap-3', className)} {...props} />;
}

export function FieldLegend({ className, ...props }: ComponentProps<'legend'>) {
  return <legend data-slot="field-legend" className={cn('mb-1 text-sm font-semibold text-text', className)} {...props} />;
}
