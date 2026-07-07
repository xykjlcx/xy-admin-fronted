import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import { InputGroup, InputGroupInput, InputGroupPrefix } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SearchFieldProps extends Omit<ComponentProps<typeof InputGroupInput>, 'type'> {
  containerClassName?: string;
}

export function SearchField({ className, containerClassName, ...props }: SearchFieldProps) {
  return (
    <InputGroup
      inputSize="sm"
      className={cn(
        'h-[calc(34px*var(--app-scale))]',
        containerClassName,
      )}
    >
      <InputGroupPrefix>
        <Search data-icon="inline-start" />
      </InputGroupPrefix>
      <InputGroupInput
        type="search"
        className={cn(
          'text-[calc(13px*var(--app-scale))]',
          className,
        )}
        {...props}
      />
    </InputGroup>
  );
}
