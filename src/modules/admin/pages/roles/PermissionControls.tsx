import { Bell, Folder, List, Network, Shield, SlidersHorizontal } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { TriState } from './types';

export function TriStateButton({
  state,
  ariaLabel,
  onClick,
  className,
  disabled,
}: {
  state: TriState;
  ariaLabel: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <span
      className={cn('inline-flex shrink-0', className)}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <Checkbox
        aria-label={ariaLabel}
        checked={state === 'all'}
        indeterminate={state === 'some'}
        disabled={disabled}
        onCheckedChange={onClick}
      />
    </span>
  );
}

export function PermissionGroupIcon({ id }: { id: string }) {
  const className = 'size-4.5 text-text-2';
  if (id === 'iam') return <Network className={className} />;
  if (id === 'audit') return <List className={className} />;
  if (id === 'file') return <Folder className={className} />;
  if (id === 'notice') return <Bell className={className} />;
  if (id === 'sys') return <SlidersHorizontal className={className} />;
  return <Shield className={className} />;
}
