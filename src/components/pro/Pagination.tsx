import { Button } from '@/components/ui/button';

export function Pagination({
  page,
  pageCount,
  totalLabel,
  refreshingLabel,
  prevLabel,
  nextLabel,
  currentLabel,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  totalLabel: string;
  refreshingLabel?: string;
  prevLabel: string;
  nextLabel: string;
  currentLabel: string;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-[calc(13px*var(--app-scale))] text-text-3">
        {totalLabel}
        {refreshingLabel && <span className="ml-3 text-(--pagination-current-fg)">{refreshingLabel}</span>}
      </span>
      <div className="flex items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={prevLabel}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="border-(--pagination-current-border) bg-(--pagination-current-bg) text-(--pagination-current-fg) hover:bg-(--pagination-current-bg) hover:text-(--pagination-current-fg)"
          aria-label={currentLabel}
          aria-current="page"
        >
          {page}
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={nextLabel}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </Button>
      </div>
    </div>
  );
}
