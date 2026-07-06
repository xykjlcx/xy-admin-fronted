import { useEffect, useMemo, useState, type JSX, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from '@tanstack/react-table';
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

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  /** 单元格渲染；row 为整行数据，index 为页内序号 */
  cell: (row: T, index: number) => ReactNode;
  /** table 列宽，如 '45%' / 'calc(120px * var(--app-scale))' */
  width: string;
  align?: DataTableAlign;
}

export interface DataTableControlledSelection {
  enabled: boolean;
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  /** 批量操作条渲染：传入当前页选中 id，返回操作区 ReactNode；无选中时不渲染 */
  renderBulkBar?: (selectedVisibleIds: string[]) => ReactNode;
  selectAllAriaLabel?: string;
  rowSelectAriaLabel?: string;
}

export interface DataTableLegacySelection {
  enabled: boolean;
  /** Step 3 临时兼容旧调用方；Step 4 切到受控选择后删除 */
  onSelectionChange?: (ids: string[]) => void;
  /** 批量操作条渲染：传入当前页选中 id，返回操作区 ReactNode；无选中时不渲染 */
  renderBulkBar?: (selectedVisibleIds: string[]) => ReactNode;
  selectAllAriaLabel?: string;
  rowSelectAriaLabel?: string;
}

export type DataTableSelection = DataTableControlledSelection | DataTableLegacySelection;

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

type DataTableColumnInput<T> = ColumnDef<T> | DataTableColumn<T>;

export interface DataTableProps<T> {
  columns: DataTableColumnInput<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  /** Step 3 临时兼容旧调用方；Step 4 切到受控选择后删除 */
  resetSelectionKey?: string;
  selection?: DataTableSelection;
  pagination?: DataTablePagination;
  onRowClick?: (row: T) => void;
  emptyText: string;
  loadingText: string;
  rowState?: (row: T) => 'selected' | undefined;
}

const bodyCellClassName = 'py-[calc(12.5px*var(--app-scale))]';

function alignClass(align: DataTableAlign | undefined) {
  if (align === 'center') return 'text-center';
  if (align === 'end') return 'text-right';
  return 'text-left';
}

function isLegacyColumn<T>(column: DataTableColumnInput<T>): column is DataTableColumn<T> {
  return 'key' in column && 'width' in column;
}

function normalizeColumn<T>(column: DataTableColumnInput<T>): ColumnDef<T> {
  if (!isLegacyColumn(column)) return column;

  return {
    id: column.key,
    header: () => column.header,
    meta: { width: column.width, align: column.align },
    enableSorting: false,
    cell: ({ row }) => column.cell(row.original, row.index),
  };
}

function isControlledSelection(
  selection: DataTableSelection | undefined,
): selection is DataTableControlledSelection {
  return !!selection && 'rowSelection' in selection && 'onRowSelectionChange' in selection;
}

function isLegacySelection(
  selection: DataTableSelection | undefined,
): selection is DataTableLegacySelection {
  return !!selection && !isControlledSelection(selection);
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
  const controlledSelection = isControlledSelection(selection) ? selection : undefined;
  const legacySelection = isLegacySelection(selection) ? selection : undefined;
  const [legacyRowSelection, setLegacyRowSelection] = useState<RowSelectionState>({});
  const rowSelection = controlledSelection?.rowSelection ?? legacyRowSelection;
  const onRowSelectionChange = controlledSelection?.onRowSelectionChange ?? setLegacyRowSelection;

  useEffect(() => {
    if (controlledSelection) return;
    setLegacyRowSelection({});
  }, [controlledSelection, resetSelectionKey]);

  const normalizedColumns = useMemo<ColumnDef<T>[]>(
    () => columns.map((column) => normalizeColumn(column)),
    [columns],
  );

  const selectionColumn = useMemo<ColumnDef<T>>(
    () => ({
      id: 'select',
      enableSorting: false,
      meta: { width: 'calc(44px * var(--app-scale))', align: 'center' },
      header: ({ table }) => {
        const allSelected = table.getIsAllPageRowsSelected();
        const someSelected = table.getIsSomePageRowsSelected();

        return (
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked)}
            aria-label={selection?.selectAllAriaLabel}
            onClick={(event) => event.stopPropagation()}
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
          aria-label={selection?.rowSelectAriaLabel}
          onClick={(event) => event.stopPropagation()}
        />
      ),
    }),
    [selection?.rowSelectAriaLabel, selection?.selectAllAriaLabel],
  );

  const tableColumns = useMemo(
    () => (selectionEnabled ? [selectionColumn, ...normalizedColumns] : normalizedColumns),
    [normalizedColumns, selectionColumn, selectionEnabled],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: rowKey,
    manualPagination: true,
    enableRowSelection: selectionEnabled,
    state: { rowSelection },
    onRowSelectionChange,
  });

  const selectedVisibleIds = table.getSelectedRowModel().rows.map((row) => row.id);
  const selectedVisibleKey = selectedVisibleIds.join('\u0000');

  useEffect(() => {
    if (controlledSelection || !selectionEnabled) return;
    legacySelection?.onSelectionChange?.(selectedVisibleKey ? selectedVisibleIds : []);
  }, [controlledSelection, legacySelection, selectedVisibleIds, selectedVisibleKey, selectionEnabled]);

  const bulkBar =
    selectionEnabled && selectedVisibleIds.length > 0
      ? selection?.renderBulkBar?.(selectedVisibleIds)
      : null;
  const columnCount = table.getVisibleLeafColumns().length;

  return (
    <>
      {bulkBar}
      <div className="overflow-hidden rounded-10 border border-(--table-border) bg-(--table-bg)">
        <Table>
          <colgroup>
            {table.getVisibleLeafColumns().map((column) => (
              <col
                key={column.id}
                style={column.columnDef.meta?.width ? { width: column.columnDef.meta.width } : undefined}
              />
            ))}
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={alignClass(header.column.columnDef.meta?.align)}
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
            {loading ? (
              <LoadingRows columns={columnCount} loadingText={loadingText} />
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => {
                const state = row.getIsSelected() ? 'selected' : rowState?.(row.original);

                return (
                  <TableRow
                    key={row.id}
                    data-state={state}
                    className={cn('border-t border-b-0 transition-none', onRowClick && 'cursor-pointer')}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const stopRowClick = cell.column.id === 'select';

                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(alignClass(cell.column.columnDef.meta?.align), bodyCellClassName)}
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
      </div>
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
