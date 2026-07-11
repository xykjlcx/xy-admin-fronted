import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function QueryState<T>({
  data,
  pending,
  error,
  loadingLabel,
  errorLabel,
  retryLabel,
  onRetry,
  className,
  children,
}: {
  data: T | undefined;
  pending: boolean;
  error: boolean;
  loadingLabel: string;
  errorLabel: string;
  retryLabel: string;
  onRetry: () => void;
  className?: string;
  children: (data: T) => ReactNode;
}) {
  if (error) {
    return (
      <div
        role="alert"
        data-slot="query-state"
        data-state="error"
        className={cn(
          'flex min-h-[calc(240px*var(--app-scale))] flex-col items-center justify-center gap-3 text-center',
          className,
        )}
      >
        <CircleAlert aria-hidden="true" className="size-8 text-danger" />
        <p className="text-sm text-text-2">{errorLabel}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    );
  }

  if (pending || data === undefined) {
    return (
      <div
        role="status"
        aria-label={loadingLabel}
        data-slot="query-state"
        data-state="loading"
        className={cn('grid min-h-[calc(240px*var(--app-scale))] gap-3', className)}
      >
        <Skeleton className="h-full min-h-[calc(240px*var(--app-scale))]" />
        <span className="sr-only">{loadingLabel}</span>
      </div>
    );
  }

  return <>{children(data)}</>;
}
