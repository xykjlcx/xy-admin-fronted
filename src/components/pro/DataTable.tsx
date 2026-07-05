import { useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Pagination } from './Pagination';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** 单元格渲染；row 为整行数据，index 为页内序号 */
  cell: (row: T, index: number) => ReactNode;
  /** table 列宽，如 '45%' / 'calc(120px * var(--app-scale))' */
  width: string;
  align?: 'start' | 'center' | 'end';
}

export interface DataTableSelection {
  enabled: boolean;
  /** 选中项变化回调；DataTable 内部持有 selectedIds，外部只在需要时（批量操作）读取 */
  onSelectionChange?: (ids: string[]) => void;
  /** 批量操作条渲染：传入当前可见选中 id，返回操作区 ReactNode；无选中时不渲染 */
  renderBulkBar?: (selectedVisibleIds: string[]) => ReactNode;
}

export interface DataTablePagination {
  page: number;
  pageCount: number;
  total: number;
  refreshing?: boolean;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** 传入后，data/筛选变化时行选择自动清空（作为 scope）。通常传当前页 id 列表的稳定标识 */
  resetSelectionKey?: string;
  selection?: DataTableSelection;
  pagination?: DataTablePagination;
  onRowClick?: (row: T) => void;
  emptyText: string;
  loadingText: string;
  rowState?: (row: T) => 'selected' | undefined;
}

const selectionColumnWidth = 'calc(44px * var(--app-scale))';

function alignClass(align: DataTableColumn<unknown>['align']) {
  if (align === 'center') return 'text-center';
  if (align === 'end') return 'text-right';
  return 'text-left';
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  resetSelectionKey,
  selection,
  pagination,
  onRowClick,
  emptyText,
  loadingText,
  rowState,
}: DataTableProps<T>): JSX.Element {
  const selectionEnabled = !!selection?.enabled;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const previousResetKey = useRef(resetSelectionKey);
  const visibleIds = useMemo(() => data.map((row) => rowKey(row)), [data, rowKey]);
  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedVisibleIds = selectedIds.filter((id) => visibleIdSet.has(id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIdSet.has(id));
  const partiallySelected = selectedVisibleIds.length > 0 && !allVisibleSelected;
  const columnCount = columns.length + (selectionEnabled ? 1 : 0);

  useEffect(() => {
    if (previousResetKey.current === resetSelectionKey) return;
    previousResetKey.current = resetSelectionKey;
    setSelectedIds([]);
    selection?.onSelectionChange?.([]);
  }, [resetSelectionKey, selection]);

  const updateSelectedIds = (updater: (current: string[]) => string[]) => {
    setSelectedIds((current) => {
      const next = updater(current);
      selection?.onSelectionChange?.(next);
      return next;
    });
  };

  const toggleRow = (id: string) => {
    updateSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleVisibleRows = () => {
    updateSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIdSet.has(id))
        : [...new Set([...current, ...visibleIds])],
    );
  };

  const bulkBar =
    selectionEnabled && selectedVisibleIds.length > 0
      ? selection?.renderBulkBar?.(selectedVisibleIds)
      : null;

  return (
    <>
      <div className="overflow-hidden rounded-10 border border-(--table-border) bg-(--table-bg)">
        <Table>
          <colgroup>
            {selectionEnabled && <col style={{ width: selectionColumnWidth }} />}
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow>
              {selectionEnabled && (
                <TableHead className="text-center" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={allVisibleSelected}
                    indeterminate={partiallySelected}
                    onCheckedChange={toggleVisibleRows}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.key} className={alignClass(column.align)}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <LoadingRows columns={columnCount} loadingText={loadingText} />
            ) : data.length > 0 ? (
              data.map((row, index) => {
                const id = rowKey(row);
                const state = selectedIdSet.has(id) ? 'selected' : rowState?.(row);

                return (
                  <TableRow
                    key={id}
                    data-state={state}
                    className={cn(onRowClick && 'cursor-pointer')}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {selectionEnabled && (
                      <TableCell className="text-center" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={selectedIdSet.has(id)}
                          onCheckedChange={() => toggleRow(id)}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.key} className={alignClass(column.align)}>
                        {column.cell(row, index)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-36 text-center text-(--table-header-fg)">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {bulkBar}
      {pagination && (
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          totalLabel={`共 ${pagination.total} 条`}
          refreshingLabel={pagination.refreshing ? '正在更新' : undefined}
          prevLabel="上一页"
          nextLabel="下一页"
          currentLabel={`当前第 ${pagination.page} 页`}
          onPageChange={pagination.onPageChange}
        />
      )}
    </>
  );
}

function LoadingRows({ columns, loadingText }: { columns: number; loadingText: string }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <TableRow key={rowIndex} data-testid="data-table-loading-row">
          {Array.from({ length: columns }).map((__, cellIndex) => (
            <TableCell key={cellIndex}>
              {rowIndex === 0 && cellIndex === 0 && (
                <span role="status" aria-label={loadingText} className="sr-only">
                  {loadingText}
                </span>
              )}
              <Skeleton
                className={cn(
                  'h-3',
                  cellIndex === 0 && 'mx-auto w-4',
                  cellIndex === columns - 1 && 'w-16',
                  cellIndex > 0 && cellIndex < columns - 1 && 'w-3/4',
                )}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
