import { ChevronDown } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const filterControlClassName = [
  'border-(--field-border) bg-(--field-bg) text-(--field-fg) shadow-none',
  'hover:border-(--field-border-hover) hover:bg-(--field-bg) hover:text-(--field-fg)',
  'data-[state=open]:border-(--field-border-hover) data-[state=open]:bg-(--field-bg-focus) data-[state=open]:text-(--field-fg)',
  'disabled:border-(--field-border) disabled:bg-(--field-bg-disabled) disabled:text-(--field-placeholder)',
].join(' ');

type FilterButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'variant'>;

export function FilterButton({ className, ...props }: FilterButtonProps) {
  return <Button variant="ghost" size="sm" className={cn(filterControlClassName, className)} {...props} />;
}

export interface FilterSelectOption<TValue extends string> {
  value: TValue;
  label: ReactNode;
}

export interface FilterSelectProps<TValue extends string> {
  label: ReactNode;
  value: TValue;
  options: FilterSelectOption<TValue>[];
  onValueChange: (value: TValue) => void;
}

export function FilterSelect<TValue extends string>({
  label,
  value,
  options,
  onValueChange,
}: FilterSelectProps<TValue>) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <FilterButton
          data-role-filter-control="select"
          aria-haspopup="menu"
          aria-label={`${label} ${selected?.label ?? ''}`}
        >
          <span className="text-(--field-placeholder)">{label}</span>
          <span className="font-medium text-(--field-fg)">{selected?.label}</span>
          <ChevronDown data-icon="inline-end" />
        </FilterButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[calc(140px*var(--app-scale))]">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup value={value} onValueChange={(next) => onValueChange(next as TValue)}>
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
