import * as React from 'react';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

const EMPTY_ITEM_VALUE = '__ui_select_empty__';

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = 'md',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        [
          'ui-field flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border px-3 text-sm outline-none transition-[background,border-color,color,box-shadow]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[size=sm]:h-[var(--control-sm)] data-[size=md]:h-[var(--control-md)] data-[size=lg]:h-[var(--control-lg)]',
          '*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2',
          '[&_[data-icon]]:pointer-events-none [&_[data-icon]]:shrink-0',
        ].join(' '),
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon data-icon="inline-end" className="transition-transform duration-150 group-data-[state=open]:rotate-180" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'popper',
  align = 'start',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'anim-modal-in relative z-50 max-h-[min(var(--radix-select-content-available-height),calc(280px*var(--app-scale)))] min-w-[calc(8rem*var(--app-scale))] overflow-hidden rounded-14 border border-(--overlay-border) bg-(--overlay-bg) text-(--overlay-fg) shadow-(--overlay-shadow-popover)',
          position === 'popper' && 'w-[var(--radix-select-trigger-width)]',
          className,
        )}
        position={position}
        align={align}
        sideOffset={sideOffset}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('px-2 py-1.5 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex min-h-[calc(34px*var(--app-scale))] w-full cursor-pointer select-none items-center gap-2 rounded-8 py-1.5 pr-8 pl-2 text-sm text-text outline-none transition-colors focus:bg-pri-soft focus:text-pri data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:bg-pri-soft data-[state=checked]:font-semibold data-[state=checked]:text-pri',
        '[&_[data-icon]]:pointer-events-none [&_[data-icon]]:shrink-0 [&_[data-icon]]:size-[calc(15px*var(--app-scale))]',
        className,
      )}
      {...props}
    >
      <span
        data-slot="select-item-indicator"
        className="absolute right-2 flex size-3.5 items-center justify-center"
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon data-icon="inline-start" className="stroke-[3px]" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        'flex cursor-pointer items-center justify-center py-1 text-text-3',
        className,
      )}
      {...props}
    >
      <ChevronUpIcon data-icon="inline-start" className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        'flex cursor-pointer items-center justify-center py-1 text-text-3',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon data-icon="inline-start" className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

function toRadixValue(value: string, hasEmptyOption: boolean) {
  if (value === '') return hasEmptyOption ? EMPTY_ITEM_VALUE : undefined;
  return value;
}

function fromRadixValue(value: string) {
  return value === EMPTY_ITEM_VALUE ? '' : value;
}

export interface SelectControlProps {
  id?: string;
  value: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  onValueChange: (value: string) => void;
}

function SelectControl({
  id,
  value,
  options,
  placeholder,
  disabled,
  size = 'md',
  className,
  triggerClassName,
  contentClassName,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  onValueChange,
}: SelectControlProps) {
  const hasEmptyOption = options.some((option) => option.value === '');

  return (
    <Select
      value={toRadixValue(value, hasEmptyOption)}
      disabled={disabled}
      onValueChange={(nextValue) => onValueChange(fromRadixValue(nextValue))}
    >
      <SelectTrigger
        id={id}
        size={size}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={cn('group', triggerClassName, className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value || EMPTY_ITEM_VALUE}
              value={option.value === '' ? EMPTY_ITEM_VALUE : option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export {
  Select,
  SelectContent,
  SelectControl,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
