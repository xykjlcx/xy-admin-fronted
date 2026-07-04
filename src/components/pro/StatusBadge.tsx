import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';

export type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface StatusBadgeProps {
  tone: StatusBadgeTone;
  children: ReactNode;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ tone, children, showDot = true, className }: StatusBadgeProps) {
  return (
    <Badge variant={tone} dot={showDot} dotTestId="status-badge-dot" className={className}>
      {children}
    </Badge>
  );
}
