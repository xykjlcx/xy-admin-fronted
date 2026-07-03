import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface StatusBadgeProps {
  tone: StatusBadgeTone;
  children: ReactNode;
  showDot?: boolean;
  className?: string;
}

const toneClass: Record<StatusBadgeTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-2 text-text-3',
};

export function StatusBadge({ tone, children, showDot = true, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-5 px-2 py-0.5 text-xs',
        toneClass[tone],
        className,
      )}
    >
      {showDot && <span data-testid="status-badge-dot" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
