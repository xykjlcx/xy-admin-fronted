import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(page, 1), Math.max(pageCount, 1));
}

function buildPaginationItems(page: number, pageCount: number): PaginationItem[] {
  const normalizedPageCount = Math.max(pageCount, 1);
  const currentPage = clampPage(page, normalizedPageCount);

  if (normalizedPageCount <= 7) {
    return Array.from({ length: normalizedPageCount }, (_, index) => index + 1);
  }

  const pageNumbers = new Set(
    [1, currentPage - 1, currentPage, currentPage + 1, normalizedPageCount].filter(
      (pageNumber) => pageNumber >= 1 && pageNumber <= normalizedPageCount,
    ),
  );
  const sortedPageNumbers = [...pageNumbers].sort((left, right) => left - right);
  const items: PaginationItem[] = [];

  sortedPageNumbers.forEach((pageNumber, index) => {
    const previousPageNumber = sortedPageNumbers[index - 1];

    if (previousPageNumber !== undefined) {
      const gap = pageNumber - previousPageNumber;

      if (gap === 2) {
        items.push(previousPageNumber + 1);
      } else if (gap > 2) {
        items.push(index === 1 ? 'ellipsis-start' : 'ellipsis-end');
      }
    }

    items.push(pageNumber);
  });

  return items;
}

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
  const currentPage = clampPage(page, pageCount);
  const normalizedPageCount = Math.max(pageCount, 1);
  const items = buildPaginationItems(currentPage, normalizedPageCount);

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="text-[calc(13px*var(--app-scale))] text-text-3">
        {totalLabel}
        {refreshingLabel && <span className="ml-3 text-(--pagination-current-fg)">{refreshingLabel}</span>}
      </span>
      <nav aria-label={currentLabel}>
        <ul className="flex items-center gap-2 text-[calc(13px*var(--app-scale))] text-text-2">
          <li>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={prevLabel}
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              ‹
            </Button>
          </li>
          <li>
            <ol className="flex items-center gap-[calc(2px*var(--app-scale))]">
              {items.map((item) => (
                <li key={item}>
                  {typeof item === 'number' ? (
                    <Button
                      type="button"
                      variant={item === currentPage ? 'outline' : 'ghost'}
                      size="icon-sm"
                      className={cn(
                        'tabular-nums',
                        item === currentPage &&
                          'border-(--pagination-current-border) bg-(--pagination-current-bg) text-(--pagination-current-fg) hover:bg-(--pagination-current-bg) hover:text-(--pagination-current-fg)',
                      )}
                      aria-label={item === currentPage ? currentLabel : undefined}
                      aria-current={item === currentPage ? 'page' : undefined}
                      onClick={item === currentPage ? undefined : () => onPageChange(item)}
                    >
                      {item}
                    </Button>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex size-[var(--control-sm)] items-center justify-center text-(--table-header-fg)"
                    >
                      ...
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </li>
          <li>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={nextLabel}
              disabled={currentPage >= normalizedPageCount}
              onClick={() => onPageChange(currentPage + 1)}
            >
              ›
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
