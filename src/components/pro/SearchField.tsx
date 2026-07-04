import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface SearchFieldProps extends Omit<ComponentProps<typeof Input>, 'type'> {
  containerClassName?: string;
}

export function SearchField({ className, containerClassName, ...props }: SearchFieldProps) {
  return (
    <div
      className={cn(
        'flex h-[calc(34px*var(--app-scale))] items-center gap-2 rounded-8 bg-surface-2 px-2.5',
        containerClassName,
      )}
    >
      <Search className="size-3.5 text-text-3" />
      <Input
        type="search"
        className={cn(
          'h-auto flex-1 border-0 bg-transparent px-0 py-0 text-[calc(13px*var(--app-scale))] shadow-none focus-visible:ring-0',
          className,
        )}
        {...props}
      />
    </div>
  );
}
