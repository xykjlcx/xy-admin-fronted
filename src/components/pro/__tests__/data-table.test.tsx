import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DataTable, type DataTableColumn } from '@/components/pro/DataTable';

interface Row {
  id: string;
  name: string;
  status: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: '姓名', width: '45%', cell: (row) => row.name },
  { key: 'status', header: '状态', width: '35%', cell: (row) => row.status },
  {
    key: 'action',
    header: '操作',
    width: '20%',
    align: 'end',
    cell: (row) => <button type="button">查看{row.name}</button>,
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
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(onPageChange).toHaveBeenCalledWith(2);
});

test('DataTable owns selection, filters bulk ids to visible rows, and clears on reset scope change', async () => {
  const onSelectionChange = vi.fn();
  const { rerender } = render(
    <DataTable
      columns={columns}
      data={pageOneRows}
      rowKey={(row) => row.id}
      emptyText="暂无成员"
      loadingText="正在加载成员"
      resetSelectionKey="members"
      selection={{
        enabled: true,
        onSelectionChange,
        renderBulkBar: (ids) => <div>当前页已选 {ids.join(',')}</div>,
      }}
    />,
  );

  const [headerCheckbox, firstRowCheckbox] = screen.getAllByRole('checkbox');
  expect(headerCheckbox?.closest('[data-slot="checkbox"]')).toHaveClass(
    'size-[calc(16px*var(--app-scale))]',
    'translate-x-2',
  );
  await userEvent.click(firstRowCheckbox!);
  expect(onSelectionChange).toHaveBeenLastCalledWith(['u1']);
  expect(screen.getByText('当前页已选 u1')).toBeInTheDocument();

  rerender(
    <DataTable
      columns={columns}
      data={pageTwoRows}
      rowKey={(row) => row.id}
      emptyText="暂无成员"
      loadingText="正在加载成员"
      resetSelectionKey="members"
      selection={{
        enabled: true,
        onSelectionChange,
        renderBulkBar: (ids) => <div>当前页已选 {ids.join(',')}</div>,
      }}
    />,
  );
  expect(screen.queryByText('当前页已选 u1')).not.toBeInTheDocument();

  const [, pageTwoFirstCheckbox] = screen.getAllByRole('checkbox');
  await userEvent.click(pageTwoFirstCheckbox!);
  expect(onSelectionChange).toHaveBeenLastCalledWith(['u1', 'u3']);
  expect(screen.getByText('当前页已选 u3')).toBeInTheDocument();

  rerender(
    <DataTable
      columns={columns}
      data={pageTwoRows}
      rowKey={(row) => row.id}
      emptyText="暂无成员"
      loadingText="正在加载成员"
      resetSelectionKey="members|disabled"
      selection={{
        enabled: true,
        onSelectionChange,
        renderBulkBar: (ids) => <div>当前页已选 {ids.join(',')}</div>,
      }}
    />,
  );
  expect(screen.queryByText(/当前页已选/)).not.toBeInTheDocument();
  expect(onSelectionChange).toHaveBeenLastCalledWith([]);
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

test('DataTable uses ui table and checkbox primitives without module or i18n coupling', () => {
  const source = readFileSync('src/components/pro/DataTable.tsx', 'utf8');

  expect(source).toContain("@/components/ui/table");
  expect(source).toContain("@/components/ui/checkbox");
  expect(source).not.toContain('TableShell');
  expect(source).not.toContain('@/modules/');
  expect(source).not.toContain('useTranslation');
  expect(source).not.toContain('共 ');
  expect(source).not.toContain('正在更新');
  expect(source).not.toContain('上一页');
  expect(source).not.toContain('下一页');
  expect(source).not.toContain('当前第');
});

test('DataTable does not notify selection from inside a React state updater', () => {
  const source = readFileSync('src/components/pro/DataTable.tsx', 'utf8');
  const updaterCalls = source.match(/setSelectedIds\(\s*\(current\)\s*=>[\s\S]*?\);/g) ?? [];

  expect(updaterCalls.length).toBeGreaterThan(0);
  updaterCalls.forEach((call) => {
    expect(call).not.toContain('onSelectionChange');
  });
});
