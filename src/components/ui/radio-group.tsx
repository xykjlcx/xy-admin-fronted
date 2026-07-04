import * as React from 'react';
import { CircleIcon } from 'lucide-react';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('grid gap-3', className)}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'aspect-square size-[calc(16px*var(--app-scale))] shrink-0 cursor-pointer rounded-full border border-(--choice-border) bg-(--choice-bg) shadow-card-sm outline-none transition-[background,border-color,box-shadow,color] focus-visible:border-(--choice-border-hover) focus-visible:ring-[length:var(--focus-ring)] focus-visible:ring-(--choice-ring) disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-(--field-border-invalid) aria-invalid:ring-(--field-ring-invalid) data-[state=checked]:border-(--choice-border-checked) data-[state=checked]:aria-invalid:border-(--field-border-invalid)',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="relative flex items-center justify-center"
      >
        <CircleIcon data-icon="radio-indicator" className="absolute top-1/2 left-1/2 size-[calc(8px*var(--app-scale))] -translate-x-1/2 -translate-y-1/2 fill-(--choice-bg-checked)" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
