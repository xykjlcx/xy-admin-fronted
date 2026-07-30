import { useMemo, useRef, type CSSProperties, type JSX, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnPinningState,
  type OnChangeFn,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

type DataTableAlign = 'start' | 'center' | 'end';

export interface DataTableSelection<T> {
  enabled: boolean;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  /** 批量操作条渲染：传入当前页选中 id，返回操作区 ReactNode；无选中时不渲染 */
  renderBulkBar?: (selectedVisibleIds: string[]) => ReactNode;
  /** 表头全选框可访问名称（必填，保证读屏可用） */
  selectAllAriaLabel: string;
  /** 行选择框可访问名称（必填，按行数据生成，如带成员名） */
  rowSelectAriaLabel: (row: T) => string;
}

export interface DataTablePagination {
  page: number;
  pageCount: number;
  total: number;
  refreshing?: boolean;
  totalLabel: string;
  refreshingLabel?: string;
  prevLabel: string;
  nextLabel: string;
  currentLabel: string;
  onPageChange: (page: number) => void;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: boolean;
  errorText?: string;
  retryText?: string;
  onRetry?: () => void;
  selection?: DataTableSelection<T>;
  pagination?: DataTablePagination;
  onRowClick?: (row: T) => void;
  emptyText: string;
  loadingText: string;
  rowState?: (row: T) => 'selected' | undefined;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
}

const emptyRowSelection: RowSelectionState = {};
const emptyColumnVisibility: VisibilityState = {};
const rowSelectionColumnId = '__row_selection__';
const checkboxCellContentClassName = 'flex items-center justify-center leading-none';

function alignClass(align: DataTableAlign | undefined) {
  if (align === 'center') return 'text-center';
  if (align === 'end') return 'text-right';
  return 'text-left';
}

function scaledPx(value: number) {
  return `calc(${value}px * var(--app-scale))`;
}

function columnId<T>(column: ColumnDef<T>): string | undefined {
  if (column.id) return column.id;
  if ('accessorKey' in column && typeof column.accessorKey === 'string') return column.accessorKey;
  return undefined;
}

function columnPinning<T>(columns: ColumnDef<T>[]): ColumnPinningState {
  return columns.reduce<ColumnPinningState>(
    (state, column) => {
      const id = columnId(column);
      const pin = column.meta?.pin;
      if (!id || !pin) return state;
      const ids = state[pin];
      if (ids) ids.push(id);
      return state;
    },
    { left: [], right: [] },
  );
}

function pinnedColumnStyle<T>(column: Column<T>): CSSProperties | undefined {
  const pinned = column.getIsPinned();
  if (pinned === 'left') return { left: scaledPx(column.getStart('left')) };
  if (pinned === 'right') return { right: scaledPx(column.getAfter('right')) };
  return undefined;
}

function pinnedColumnClass<T>(column: Column<T>, surface: 'header' | 'body') {
  const pinned = column.getIsPinned();
  if (!pinned) return undefined;

  return cn(
    'sticky z-10',
    surface === 'header' ? 'bg-(--table-header-bg)' : 'ui-table-pinned-cell',
    pinned === 'left' && column.getStart('left') === 0 && 'left-0',
    pinned === 'right' && column.getAfter('right') === 0 && 'right-0',
  );
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  error = false,
  errorText,
  retryText,
  onRetry,
  selection,
  pagination,
  onRowClick,
  emptyText,
  loadingText,
  rowState,
  columnVisibility = emptyColumnVisibility,
  onColumnVisibilityChange,
}: DataTableProps<T>): JSX.Element {
  const selectionEnabled = !!selection?.enabled;
  const rowSelection = selectionEnabled ? selection.rowSelection : emptyRowSelection;
  const onRowSelectionChange = selectionEnabled ? selection.onRowSelectionChange : undefined;

  // selection（含 aria-label 取值函数）经 ref 读取，让 selectionColumn 保持稳定 deps=[]：
  // 否则消费方每次渲染传入的内联 rowSelectAriaLabel 会重建列定义，触发整表 DOM 重挂。
  // header/cell 由 flexRender 每次渲染重新调用，从 ref 读到的始终是最新 selection。
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  const selectionColumn = useMemo<ColumnDef<T>>(
    () => ({
      id: rowSelectionColumnId,
      size: 40,
      minSize: 40,
      maxSize: 40,
      enableSorting: false,
      enablePinning: true,
      meta: { headerAlign: 'center', cellAlign: 'center', pin: 'left' },
      header: ({ table }) => {
        const allSelected = table.getIsAllPageRowsSelected();
        const someSelected = table.getIsSomePageRowsSelected();

        return (
          <div className={checkboxCellContentClassName}>
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
              aria-label={selectionRef.current?.selectAllAriaLabel}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        );
      },
      cell: ({ row }) => (
        <div className={checkboxCellContentClassName}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(checked)}
            aria-label={selectionRef.current?.rowSelectAriaLabel(row.original)}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ),
    }),
    [],
  );

  const tableColumns = useMemo(
    () => (selectionEnabled ? [selectionColumn, ...columns] : columns),
    [columns, selectionColumn, selectionEnabled],
  );
  const pinnedColumns = useMemo(() => columnPinning(tableColumns), [tableColumns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: rowKey,
    manualPagination: true,
    enableRowSelection: selectionEnabled,
    enableColumnPinning: true,
    state: { rowSelection, columnPinning: pinnedColumns, columnVisibility },
    onRowSelectionChange,
    onColumnVisibilityChange,
  });

  const selectedVisibleIds = table.getSelectedRowModel().rows.map((row) => row.id);
  const bulkBar =
    selectionEnabled && selectedVisibleIds.length > 0
      ? selection?.renderBulkBar?.(selectedVisibleIds)
      : null;
  const visibleColumns = table.getVisibleLeafColumns();
  const columnCount = visibleColumns.length;
  const tableMinWidth = visibleColumns.reduce((total, column) => total + column.getSize(), 0);

  return (
    <>
      {bulkBar}
      <Table
        containerClassName="rounded-10 bg-(--table-bg)"
        aria-busy={loading}
        style={{ minWidth: `max(100%, ${scaledPx(tableMinWidth)})` }}
      >
          <colgroup>
            {visibleColumns.map((column) => (
              <col key={column.id} style={{ width: scaledPx(column.getSize()) }} />
            ))}
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      alignClass(header.column.columnDef.meta?.headerAlign),
                      pinnedColumnClass(header.column, 'header'),
                    )}
                    style={pinnedColumnStyle(header.column)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="[&_tr:last-child]:border-t">
            {error ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-36 text-center text-(--table-header-fg)">
                  <div role="alert" className="flex flex-col items-center justify-center gap-2">
                    <CircleAlert aria-hidden="true" className="size-5 text-danger" />
                    <span>{errorText}</span>
                    {onRetry && retryText && (
                      <Button variant="outline" size="sm" onClick={onRetry}>
                        {retryText}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : loading ? (
              <LoadingRows columns={visibleColumns} loadingText={loadingText} />
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => {
                const state = selectionEnabled && row.getIsSelected() ? 'selected' : rowState?.(row.original);

                return (
                  <TableRow
                    key={row.id}
                    data-state={state}
                    aria-selected={state === 'selected' ? true : selectionEnabled ? false : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn('border-t border-(--table-row-border) border-b-0 transition-none', onRowClick && 'cursor-pointer')}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    onKeyDown={onRowClick ? (event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      onRowClick(row.original);
                    } : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const stopRowClick =
                        cell.column.id === rowSelectionColumnId ||
                        cell.column.columnDef.meta?.stopRowClick === true;

                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            alignClass(cell.column.columnDef.meta?.cellAlign),
                            pinnedColumnClass(cell.column, 'body'),
                          )}
                          style={pinnedColumnStyle(cell.column)}
                          onClick={stopRowClick ? (event) => event.stopPropagation() : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
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
      {pagination && (
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          totalLabel={pagination.totalLabel}
          refreshingLabel={pagination.refreshing ? pagination.refreshingLabel : undefined}
          prevLabel={pagination.prevLabel}
          nextLabel={pagination.nextLabel}
          currentLabel={pagination.currentLabel}
          onPageChange={pagination.onPageChange}
        />
      )}
    </>
  );
}

function LoadingRows<T>({ columns, loadingText }: { columns: Column<T>[]; loadingText: string }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <TableRow key={rowIndex} data-testid="data-table-loading-row">
          {columns.map((column, cellIndex) => {
            const isSelectionColumn = column.id === rowSelectionColumnId;
            const isLastColumn = cellIndex === columns.length - 1;

            return (
              <TableCell
                key={column.id}
                className={cn(
                  alignClass(column.columnDef.meta?.cellAlign),
                  pinnedColumnClass(column, 'body'),
                )}
                style={pinnedColumnStyle(column)}
              >
                {rowIndex === 0 && cellIndex === 0 && (
                  <span role="status" aria-label={loadingText} className="sr-only">
                    {loadingText}
                  </span>
                )}
                <Skeleton
                  className={cn(
                    'h-3',
                    isSelectionColumn && 'mx-auto w-4',
                    !isSelectionColumn && isLastColumn && 'w-16',
                    !isSelectionColumn && column.columnDef.meta?.cellAlign === 'end' && 'ml-auto',
                    !isSelectionColumn && !isLastColumn && 'w-3/4',
                  )}
                />
              </TableCell>
            );
          })}
        </TableRow>
      ))}
    </>
  );
}
