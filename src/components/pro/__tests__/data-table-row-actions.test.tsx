import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DataTableRowActions, type DataTableRowAction } from '../DataTableRowActions';

test('renders one or two actions directly without an overflow menu', async () => {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const actions: DataTableRowAction[] = [
    { id: 'edit', label: '编辑', onSelect: onEdit },
    { id: 'delete', label: '删除', onSelect: onDelete, tone: 'danger' },
  ];

  render(<DataTableRowActions actions={actions} overflowLabel="更多操作" />);

  expect(screen.getByRole('button', { name: '编辑' })).toHaveStyle({
    paddingInline: 0,
    borderWidth: 0,
  });
  expect(screen.getByRole('button', { name: '删除' })).toHaveAttribute('data-variant', 'link');
  expect(screen.getByRole('button', { name: '删除' })).toHaveClass('text-(--menu-item-fg-danger)');
  expect(screen.getByRole('button', { name: '删除' })).toHaveStyle({
    paddingInline: 0,
    borderWidth: 0,
  });
  const separators = document.querySelectorAll('[data-slot="data-table-row-action-separator"]');
  expect(separators).toHaveLength(1);
  expect(separators[0]).toHaveAttribute('aria-hidden', 'true');
  expect(separators[0]).toHaveClass('h-3', 'w-px', 'bg-(--table-row-border)');
  expect(screen.queryByRole('button', { name: '更多操作' })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '编辑' }));
  await userEvent.click(screen.getByRole('button', { name: '删除' }));
  expect(onEdit).toHaveBeenCalledOnce();
  expect(onDelete).toHaveBeenCalledOnce();
});

test('keeps the first of three or more actions visible and moves the rest into a menu', async () => {
  const onEdit = vi.fn();
  const onReset = vi.fn();
  const onDelete = vi.fn();
  const actions: DataTableRowAction[] = [
    { id: 'edit', label: '编辑', onSelect: onEdit },
    { id: 'reset', label: '重置密码', onSelect: onReset },
    { id: 'delete', label: '删除', onSelect: onDelete, tone: 'danger' },
  ];

  render(<DataTableRowActions actions={actions} overflowLabel="更多操作" />);

  expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '重置密码' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
  expect(document.querySelector('[data-slot="data-table-row-action-separator"]')).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '更多操作' }));
  expect(await screen.findByRole('menuitem', { name: '重置密码' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('menuitem', { name: '删除' }));

  expect(onEdit).not.toHaveBeenCalled();
  expect(onReset).not.toHaveBeenCalled();
  expect(onDelete).toHaveBeenCalledOnce();
});
