import { Bell, Check, Folder, List, Network, Shield, SlidersHorizontal } from 'lucide-react';
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
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        'flex size-[calc(18px*var(--app-scale))] shrink-0 items-center justify-center rounded-5 border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        state === 'none' ? 'border-border bg-surface text-transparent hover:border-pri' : 'border-pri bg-pri text-white',
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {state === 'all' && <Check className="size-[calc(12px*var(--app-scale))] stroke-[3px]" />}
      {state === 'some' && <Check className="size-[calc(12px*var(--app-scale))] stroke-[3px]" />}
    </button>
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
