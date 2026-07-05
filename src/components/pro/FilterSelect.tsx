import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface FilterSelectOption<TValue extends string> {
  value: TValue;
  label: ReactNode;
}

export interface FilterSelectProps<TValue extends string> {
  label: ReactNode;
  value: TValue;
  options: FilterSelectOption<TValue>[];
  triggerClassName?: string;
  onValueChange: (value: TValue) => void;
}

export function FilterSelect<TValue extends string>({
  label,
  value,
  options,
  triggerClassName,
  onValueChange,
}: FilterSelectProps<TValue>) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-role-filter-control="select"
          variant="ghost"
          size="sm"
          aria-haspopup="menu"
          aria-label={`${label} ${selected?.label ?? ''}`}
          className={triggerClassName}
        >
          <span className="text-text-3">{label}</span>
          <span className="font-medium text-text">{selected?.label}</span>
          <ChevronDown data-icon="inline-end" />
        </Button>
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
