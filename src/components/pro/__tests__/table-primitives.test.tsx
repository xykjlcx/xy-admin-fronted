import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ConfirmDialog } from '@/components/pro/ConfirmDialog';
import { StatusBadge } from '@/components/pro/StatusBadge';
import { TableShell, TableShellHeader, TableShellRow } from '@/components/pro/TableShell';

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
