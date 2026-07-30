import { readFileSync } from 'node:fs';
import { useState } from 'react';
import type { ColumnDef, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DataTable } from '@/components/pro/DataTable';

interface Row {
  id: string;
  name: string;
  status: string;
}

const columns: ColumnDef<Row>[] = [
  {
    id: 'name',
    header: '姓名',
    size: 220,
    minSize: 180,
    enableSorting: false,
    cell: ({ row }) => row.original.name,
  },
  {
    id: 'status',
    header: '状态',
    size: 140,
    minSize: 120,
    enableSorting: false,
    cell: ({ row }) => row.original.status,
  },
  {
    id: 'action',
    header: '操作',
    size: 160,
    minSize: 160,
    maxSize: 160,
    meta: { headerAlign: 'start', cellAlign: 'end', pin: 'right', stopRowClick: true },
    enableSorting: false,
    cell: ({ row }) => <button type="button">查看{row.original.name}</button>,
  },
];

const pageOneRows: Row[] = [
  { id: 'u1', name: '李长昕', status: '正常' },
  { id: 'u2', name: '王思远', status: '正常' },
];

const pageTwoRows: Row[] = [
  { id: 'u3', name: '陈嘉怡', status: '正常' },
  { id: 'u4', name: '赵敏杰', status: '正常' },
];

function ControlledSelectionTable({
  data,
  onRowClick,
}: {
  data: Row[];
  onRowClick?: (row: Row) => void;
}) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    setRowSelection((current) => (typeof updater === 'function' ? updater(current) : updater));
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={(row) => row.id}
      emptyText="暂无成员"
      loadingText="正在加载成员"
      onRowClick={onRowClick}
      selection={{
        enabled: true,
        rowSelection,
        onRowSelectionChange: handleRowSelectionChange,
        selectAllAriaLabel: '选择本页',
        rowSelectAriaLabel: (row) => `选择${row.name}`,
        renderBulkBar: (ids) => <div>当前页已选 {ids.join(',')}</div>,
      }}
    />
  );
}

test('DataTable renders semantic table, col widths, cells and pagination', async () => {
  const onPageChange = vi.fn();
  render(
    <DataTable
      columns={columns}
      data={pageOneRows}
      rowKey={(row) => row.id}
      emptyText="暂无成员"
      loadingText="正在加载成员"
      pagination={{
        page: 1,
        pageCount: 2,
        total: 4,
        totalLabel: '4 records',
        prevLabel: 'Previous',
        nextLabel: 'Next',
        currentLabel: 'Page 1',
        onPageChange,
      }}
    />,
  );

  const table = screen.getByRole('table');
  const tableContainer = table.parentElement;
  if (!tableContainer) throw new Error('data table container not found');
  expect(table).toBeInTheDocument();
  expect(tableContainer).toHaveClass('overflow-x-auto', 'rounded-10', 'bg-(--table-bg)');
  expect(tableContainer).not.toHaveClass('overflow-hidden', 'border', 'border-(--table-shell-border)');
  expect(table.getAttribute('style')).toContain(
    'min-width: max(100%, calc(520px * var(--app-scale)))',
  );
  expect(table.querySelector('colgroup')).toBeInTheDocument();
  expect(table.querySelectorAll('col')).toHaveLength(columns.length);
  expect(table.querySelector('col')?.getAttribute('style')).toContain(
    'width: calc(220px * var(--app-scale))',
  );
  expect(screen.getByRole('columnheader', { name: '姓名' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '李长昕' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '王思远' })).toBeInTheDocument();

  const actionHeader = screen.getByRole('columnheader', { name: '操作' });
  const actionCell = screen.getByRole('cell', { name: '查看李长昕' });
  expect(actionHeader).toHaveClass('text-left', 'sticky', 'right-0');
  expect(actionHeader).not.toHaveClass('text-right');
  expect(actionCell).toHaveClass('text-right', 'sticky', 'right-0', 'ui-table-pinned-cell');
  expect(actionCell).not.toHaveClass('bg-(--_table-row-bg)');

  expect(screen.getByText('4 records')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(onPageChange).toHaveBeenCalledWith(2);
});

test('DataTable exposes a recoverable error row instead of disguising failures as empty data', async () => {
  const onRetry = vi.fn();
  render(
    <DataTable
      columns={columns}
      data={[]}
      rowKey={(row) => row.id}
      error
      errorText="成员加载失败"
      retryText="重新加载"
      onRetry={onRetry}
      emptyText="暂无成员"
      loadingText="正在加载成员"
    />,
  );

  expect(screen.getByRole('alert')).toHaveTextContent('成员加载失败');
  expect(screen.queryByText('暂无成员')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: '重新加载' }));
  expect(onRetry).toHaveBeenCalledOnce();
});

test('DataTable uses controlled TanStack row selection scoped to current page', async () => {
  const { rerender } = render(<ControlledSelectionTable data={pageOneRows} />);
  const [headerCheckbox, firstRowCheckbox] = screen.getAllByRole('checkbox');

  await userEvent.click(firstRowCheckbox!);
  expect(screen.getByText('当前页已选 u1')).toBeInTheDocument();
  expect(headerCheckbox).toHaveAttribute('data-indeterminate', 'true');

  await userEvent.click(headerCheckbox!);
  expect(screen.getByText('当前页已选 u1,u2')).toBeInTheDocument();

  await userEvent.click(headerCheckbox!);
  expect(screen.queryByText(/当前页已选/)).not.toBeInTheDocument();

  await userEvent.click(firstRowCheckbox!);
  expect(screen.getByText('当前页已选 u1')).toBeInTheDocument();

  rerender(<ControlledSelectionTable data={pageTwoRows} />);
  expect(screen.queryByText('当前页已选 u1')).not.toBeInTheDocument();
});

test('DataTable selection checkboxes expose provided accessible names', () => {
  render(<ControlledSelectionTable data={pageOneRows} />);

  expect(screen.getByRole('checkbox', { name: '选择本页' })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: '选择李长昕' })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: '选择王思远' })).toBeInTheDocument();
});

test('DataTable ignores external row selection state when selection is disabled', () => {
  render(
    <DataTable
      columns={columns}
      data={pageOneRows}
      rowKey={(row) => row.id}
      emptyText="暂无成员"
      loadingText="正在加载成员"
      selection={{
        enabled: false,
        rowSelection: { u1: true },
        onRowSelectionChange: () => undefined,
        selectAllAriaLabel: '选择本页',
        rowSelectAriaLabel: (row) => `选择${row.name}`,
        renderBulkBar: (ids) => <div>当前页已选 {ids.join(',')}</div>,
      }}
    />,
  );

  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  expect(screen.queryByText(/当前页已选/)).not.toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '李长昕' }).closest('tr')).not.toHaveAttribute('data-state', 'selected');
});

test('DataTable selection and interactive columns do not trigger row click', async () => {
  const onRowClick = vi.fn();
  render(<ControlledSelectionTable data={pageOneRows} onRowClick={onRowClick} />);

  const [, firstRowCheckbox] = screen.getAllByRole('checkbox');
  const firstNameCell = screen.getByRole('cell', { name: '李长昕' });

  expect(firstRowCheckbox?.closest('[data-slot="checkbox"]')).toHaveClass(
    'size-[var(--choice-size)]',
  );
  expect(firstNameCell).toHaveClass('px-(--table-cell-px)');
  expect(firstNameCell).not.toHaveClass('p-0');

  const selectionHeader = screen.getByRole('columnheader', { name: '选择本页' });
  const selectionCell = firstRowCheckbox?.closest('td');
  expect(selectionHeader).toHaveClass('sticky', 'left-0');
  expect(selectionCell).toHaveClass('sticky', 'left-0', 'ui-table-pinned-cell');

  await userEvent.click(firstRowCheckbox!);
  expect(onRowClick).not.toHaveBeenCalled();
  if (!selectionCell) throw new Error('selection cell not found');
  await userEvent.click(selectionCell);
  expect(onRowClick).not.toHaveBeenCalled();
  const bulkBar = screen.getByText('当前页已选 u1').closest('div');
  if (!bulkBar) throw new Error('bulk bar not found');
  expect(bulkBar.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  await userEvent.click(firstNameCell);
  expect(onRowClick).toHaveBeenCalledWith(pageOneRows[0]);

  onRowClick.mockClear();
  await userEvent.click(screen.getByRole('button', { name: '查看李长昕' }));
  expect(onRowClick).not.toHaveBeenCalled();
});

test('DataTable clickable rows expose keyboard and selection semantics', async () => {
  const onRowClick = vi.fn();
  render(<ControlledSelectionTable data={pageOneRows} onRowClick={onRowClick} />);

  const row = screen.getByRole('cell', { name: '李长昕' }).closest('tr');
  const secondRow = screen.getByRole('cell', { name: '王思远' }).closest('tr');
  if (!row) throw new Error('clickable row not found');
  if (!secondRow) throw new Error('second selectable row not found');
  expect(row).toHaveAttribute('tabindex', '0');
  expect(secondRow).toHaveAttribute('aria-selected', 'false');

  row.focus();
  expect(row).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(onRowClick).toHaveBeenCalledWith(pageOneRows[0]);

  onRowClick.mockClear();
  await userEvent.keyboard(' ');
  expect(onRowClick).toHaveBeenCalledWith(pageOneRows[0]);

  const firstRowCheckbox = screen.getByRole('checkbox', { name: '选择李长昕' });
  await userEvent.click(firstRowCheckbox);
  expect(row).toHaveAttribute('aria-selected', 'true');
});

test('DataTable handles loading and empty states inside tbody', () => {
  const { rerender } = render(
    <DataTable
      columns={columns}
      data={[]}
      rowKey={(row) => row.id}
      loading
      emptyText="暂无成员"
      loadingText="正在加载成员"
    />,
  );

  expect(screen.getByRole('status', { name: '正在加载成员' })).toBeInTheDocument();
  expect(screen.getAllByTestId('data-table-loading-row')).toHaveLength(6);
  expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');

  rerender(
    <DataTable
      columns={columns}
      data={[]}
      rowKey={(row) => row.id}
      emptyText="暂无成员"
      loadingText="正在加载成员"
    />,
  );

  const row = screen.getByRole('row', { name: '暂无成员' });
  expect(within(row).getByRole('cell', { name: '暂无成员' })).toHaveAttribute('colspan', '3');
  expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'false');
});

test('DataTable delegates controlled column visibility to TanStack and recalculates table width', () => {
  render(
    <DataTable
      columns={columns}
      data={pageOneRows}
      rowKey={(row) => row.id}
      columnVisibility={{ status: false }}
      emptyText="暂无成员"
      loadingText="正在加载成员"
    />,
  );

  const table = screen.getByRole('table');
  expect(screen.queryByRole('columnheader', { name: '状态' })).not.toBeInTheDocument();
  expect(table.querySelectorAll('col')).toHaveLength(2);
  expect(table.getAttribute('style')).toContain(
    'min-width: max(100%, calc(380px * var(--app-scale)))',
  );
});

test('DataTable loading skeleton follows visible column roles instead of assuming the first column is selection', () => {
  const { rerender } = render(
    <DataTable
      columns={columns}
      data={[]}
      rowKey={(row) => row.id}
      loading
      emptyText="暂无成员"
      loadingText="正在加载成员"
    />,
  );

  const firstLoadingRow = screen.getAllByTestId('data-table-loading-row')[0];
  if (!firstLoadingRow) throw new Error('loading row missing');
  const firstSkeleton = firstLoadingRow.querySelector('[data-slot="skeleton"]');
  expect(firstSkeleton).toHaveClass('w-3/4');
  expect(firstSkeleton).not.toHaveClass('mx-auto', 'w-4');

  rerender(
    <DataTable
      columns={columns}
      data={[]}
      rowKey={(row) => row.id}
      loading
      emptyText="暂无成员"
      loadingText="正在加载成员"
      selection={{
        enabled: true,
        rowSelection: {},
        onRowSelectionChange: () => undefined,
        selectAllAriaLabel: '选择本页',
        rowSelectAriaLabel: (row) => `选择${row.name}`,
      }}
    />,
  );

  const selectedLoadingRow = screen.getAllByTestId('data-table-loading-row')[0];
  if (!selectedLoadingRow) throw new Error('selection loading row missing');
  const selectionSkeleton = selectedLoadingRow.querySelector('[data-slot="skeleton"]');
  expect(selectionSkeleton).toHaveClass('mx-auto', 'w-4');
});

test('DataTable uses ui table and checkbox primitives without module or i18n coupling', () => {
  const source = readFileSync('src/components/pro/DataTable.tsx', 'utf8');

  expect(source).toContain('useReactTable');
  expect(source).toContain('getCoreRowModel');
  expect(source).toContain('flexRender');
  expect(source).toContain("@/components/ui/table");
  expect(source).toContain("@/components/ui/checkbox");
  expect(source).not.toContain('TableShell');
  expect(source).not.toContain('@/modules/');
  expect(source).not.toContain('useTranslation');
  expect(source).not.toContain('getSortedRowModel');
  expect(source).not.toContain('getFilteredRowModel');
  expect(source).not.toContain('getGroupedRowModel');
  expect(source).not.toContain('getFacetedRowModel');
  expect(source).not.toContain('useVirtualizer');
  expect(source).not.toContain('selectedIds');
  expect(source).not.toContain('toggleVisibleRows');
  expect(source).not.toContain('resetSelectionKey');
  expect(source).not.toContain('DataTableColumn');
  expect(source).not.toContain('DataTableLegacySelection');
  expect(source).not.toContain('legacyRowSelection');
  expect(source).not.toContain('onSelectionChange');
  expect(source).not.toContain('selectionColumnWidth');
  expect(source).not.toContain('selectionCellClassName');
  expect(source).not.toContain('bodyCellWithSelectionClassName');
  expect(source).not.toContain('selectionSlotClassName');
  expect(source).not.toContain('selectionCheckboxClassName');
  expect(source).not.toContain('[role=checkbox]');
  expect(source).not.toContain('translate-y');
  expect(source).not.toContain('共 ');
  expect(source).not.toContain('正在更新');
  expect(source).not.toContain('上一页');
  expect(source).not.toContain('下一页');
  expect(source).not.toContain('当前第');
  expect(source).toContain('transition-none');
  expect(source).not.toContain('translate-x-2');
});

test('DataTable injects selection as a ColumnDef instead of rendering special selection cells', () => {
  const source = readFileSync('src/components/pro/DataTable.tsx', 'utf8');

  expect(source).toContain("const rowSelectionColumnId = '__row_selection__'");
  expect(source).toContain('selectionColumn');
  expect(source).toContain('[selectionColumn, ...columns]');
  expect(source).not.toContain("id: 'select'");
  expect(source).not.toContain('selectionEnabled && (');
  expect(source).not.toContain('selectionEnabled && <');
});
