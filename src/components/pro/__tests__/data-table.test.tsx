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
    meta: { width: '45%' },
    enableSorting: false,
    cell: ({ row }) => row.original.name,
  },
  {
    id: 'status',
    header: '状态',
    meta: { width: '35%' },
    enableSorting: false,
    cell: ({ row }) => row.original.status,
  },
  {
    id: 'action',
    header: '操作',
    meta: { width: '20%', align: 'end' },
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
  expect(table).toBeInTheDocument();
  expect(table.querySelector('colgroup')).toBeInTheDocument();
  expect(table.querySelectorAll('col')).toHaveLength(columns.length);
  expect(table.querySelector('col')?.getAttribute('style')).toContain('width: 45%');
  expect(screen.getByRole('columnheader', { name: '姓名' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '李长昕' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '王思远' })).toBeInTheDocument();

  expect(screen.getByText('4 records')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(onPageChange).toHaveBeenCalledWith(2);
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
        renderBulkBar: (ids) => <div>当前页已选 {ids.join(',')}</div>,
      }}
    />,
  );

  expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  expect(screen.queryByText(/当前页已选/)).not.toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '李长昕' }).closest('tr')).not.toHaveAttribute('data-state', 'selected');
});

test('DataTable selection column uses ordinary cells and does not trigger row click', async () => {
  const onRowClick = vi.fn();
  render(<ControlledSelectionTable data={pageOneRows} onRowClick={onRowClick} />);

  const [, firstRowCheckbox] = screen.getAllByRole('checkbox');
  const firstNameCell = screen.getByRole('cell', { name: '李长昕' });

  expect(firstRowCheckbox?.closest('[data-slot="checkbox"]')).toHaveClass(
    'size-[calc(18px*var(--app-scale))]',
  );
  expect(firstNameCell).toHaveClass('px-(--table-cell-px)');
  expect(firstNameCell).not.toHaveClass('p-0');

  await userEvent.click(firstRowCheckbox!);
  expect(onRowClick).not.toHaveBeenCalled();
  const selectionCell = firstRowCheckbox?.closest('td');
  if (!selectionCell) throw new Error('selection cell not found');
  await userEvent.click(selectionCell);
  expect(onRowClick).not.toHaveBeenCalled();
  const bulkBar = screen.getByText('当前页已选 u1').closest('div');
  if (!bulkBar) throw new Error('bulk bar not found');
  expect(bulkBar.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  await userEvent.click(firstNameCell);
  expect(onRowClick).toHaveBeenCalledWith(pageOneRows[0]);
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
