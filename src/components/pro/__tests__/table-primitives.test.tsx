import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { SearchField } from '@/components/pro/SearchField';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { TableCheckbox, TableShell, TableShellHeader, TableShellRow } from '@/components/pro/TableShell';

test('TableShell 渲染表头、行、空态和分页槽位', () => {
  const grid = 'calc(44px * var(--app-scale)) 1fr';
  const { rerender } = render(
    <TableShell
      header={
        <TableShellHeader gridTemplateColumns={grid}>
          <div>选择</div>
          <div>姓名</div>
        </TableShellHeader>
      }
      pagination={<button>下一页</button>}
    >
      <TableShellRow gridTemplateColumns={grid}>
        <div />
        <div>李长昕</div>
      </TableShellRow>
    </TableShell>,
  );

  expect(screen.getByText('姓名')).toBeInTheDocument();
  expect(screen.getByText('李长昕')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '下一页' })).toBeInTheDocument();

  rerender(
    <TableShell
      empty={<div>暂无成员</div>}
      header={<TableShellHeader gridTemplateColumns={grid}>姓名</TableShellHeader>}
    />,
  );
  expect(screen.getByText('暂无成员')).toBeInTheDocument();
});

test('TableShell 消费 Table token 而不是页面 primitive 状态类', () => {
  const grid = 'calc(44px * var(--app-scale)) 1fr';
  render(
    <TableShell
      header={
        <TableShellHeader gridTemplateColumns={grid}>
          <div>选择</div>
          <div>姓名</div>
        </TableShellHeader>
      }
    >
      <TableShellRow gridTemplateColumns={grid} data-state="selected">
        <div />
        <div>李长昕</div>
      </TableShellRow>
      <TableShellRow gridTemplateColumns={grid} aria-expanded>
        <div />
        <div>展开行</div>
      </TableShellRow>
    </TableShell>,
  );

  const shell = screen.getByText('姓名').parentElement?.parentElement;
  const header = screen.getByText('姓名').parentElement;
  const row = screen.getByText('李长昕').parentElement;
  const expandedRow = screen.getByText('展开行').parentElement;

  expect(shell).toHaveClass('border-(--table-border)');
  expect(shell).toHaveClass('bg-(--table-bg)');
  expect(header).toHaveClass('bg-(--table-header-bg)');
  expect(header).toHaveClass('text-(--table-header-fg)');
  expect(row).toHaveClass('ui-table-row');
  expect(row).not.toHaveClass('hover:bg-(--table-row-bg-hover)');
  expect(row).not.toHaveClass('data-[state=selected]:bg-(--table-row-bg-selected)');
  expect(expandedRow).toHaveClass('ui-table-row');
  expect(expandedRow).not.toHaveClass('aria-expanded:bg-(--table-row-bg-expanded)');
  expect(expandedRow).not.toHaveClass('has-aria-expanded:bg-(--table-row-bg-expanded)');
  expect(header).not.toHaveClass('bg-surface-2');
  expect(row).not.toHaveClass('hover:bg-surface-2');
});

test('StatusBadge 渲染状态文案并支持隐藏圆点', () => {
  const { rerender } = render(<StatusBadge tone="success">正常</StatusBadge>);
  expect(screen.getByText('正常')).toBeInTheDocument();
  expect(screen.getByTestId('status-badge-dot')).toBeInTheDocument();

  rerender(
    <StatusBadge tone="neutral" showDot={false}>
      停用
    </StatusBadge>,
  );
  expect(screen.getByText('停用')).toBeInTheDocument();
  expect(screen.queryByTestId('status-badge-dot')).not.toBeInTheDocument();
});

test('SearchField 继承基础 InputGroup 的聚焦态', () => {
  render(<SearchField aria-label="搜索" />);

  const group = screen.getByRole('searchbox', { name: '搜索' }).closest('[data-slot="input-group"]');
  const icon = group?.querySelector('[data-icon="inline-start"]');

  expect(group).toHaveClass('ui-field');
  expect(group).not.toHaveClass('[&_[data-icon]]:text-[var(--field-icon)]');
  expect(icon).not.toHaveClass('size-3.5');
  expect(icon).not.toHaveClass('text-text-3');
  expect(group).not.toHaveClass('bg-surface-2');
  expect(group).not.toHaveClass('focus-within:ring-0');
});

test('ConfirmDialog 点击确认和取消时触发对应回调', async () => {
  const onOpenChange = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      open
      title="删除成员"
      description="删除后不可恢复"
      cancelText="取消"
      confirmText="确认删除"
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />,
  );

  await userEvent.click(screen.getByRole('button', { name: '确认删除' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);

  await userEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test('TableCheckbox 使用自定义视觉而不是原生 checkbox 外观', async () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <TableCheckbox ariaLabel="选择成员" checked={false} onCheckedChange={onChange} />,
  );

  const checkbox = screen.getByRole('checkbox', { name: '选择成员' });
  expect(checkbox).toHaveClass('appearance-none');
  expect(checkbox.closest('[data-slot="checkbox"]')).toHaveClass('size-[calc(16px*var(--app-scale))]');

  await userEvent.click(checkbox);
  expect(onChange).toHaveBeenCalledWith(true);

  rerender(<TableCheckbox ariaLabel="选择成员" checked onCheckedChange={onChange} />);
  expect(screen.getByRole('checkbox', { name: '选择成员' }).closest('[data-slot="checkbox"]')).toHaveAttribute(
    'data-checked',
    'true',
  );
  expect(screen.getByRole('checkbox', { name: '选择成员' }).parentElement?.querySelector('[data-slot="checkbox-indicator"]')).toBeInTheDocument();
});
