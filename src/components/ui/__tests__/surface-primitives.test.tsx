import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Empty } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

test('DialogContent 使用 surface 背景而不是页面背景', () => {
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>确认操作</DialogTitle>
        <div>Dialog body</div>
      </DialogContent>
    </Dialog>,
  );

  const content = screen.getByText('Dialog body').closest('[data-slot="dialog-content"]');
  expect(content).toHaveClass('bg-surface');
  expect(content).not.toHaveClass('bg-background');
});

test('SheetContent 使用 surface 背景而不是页面背景', () => {
  render(
    <Sheet open>
      <SheetContent>
        <SheetTitle>外观设置</SheetTitle>
        <div>Sheet body</div>
      </SheetContent>
    </Sheet>,
  );

  const content = screen.getByText('Sheet body').closest('[data-slot="sheet-content"]');
  expect(content).toHaveClass('bg-surface');
  expect(content).not.toHaveClass('bg-background');
});

test('Button 使用后台设计体系变体并兼容 loading 状态', () => {
  render(
    <Button loading variant="primary">
      保存
    </Button>,
  );

  const button = screen.getByRole('button', { name: '保存' });
  expect(button).toHaveAttribute('data-variant', 'primary');
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button).toBeDisabled();
  expect(button.querySelector('[data-slot="button-spinner"]')).toBeInTheDocument();
});

test('Input 支持前缀组合形态和错误态', () => {
  render(<Input aria-label="邮箱" prefix="@" status="error" defaultValue="demo" />);

  const input = screen.getByRole('textbox', { name: '邮箱' });
  expect(input).toHaveValue('demo');
  expect(input.closest('[data-slot="input-group"]')).toHaveAttribute('data-status', 'error');
});

test('NativeSelect 暴露统一 select 基础样式状态', () => {
  render(
    <NativeSelect aria-label="部门" status="error">
      <option>研发部</option>
    </NativeSelect>,
  );

  const select = screen.getByRole('combobox', { name: '部门' });
  expect(select).toHaveAttribute('data-slot', 'native-select');
  expect(select).toHaveClass('border-danger');
});

test('Badge、Skeleton、Empty 提供基础展示原子件', () => {
  render(
    <>
      <Badge variant="success" dot dotTestId="badge-dot">
        正常
      </Badge>
      <Skeleton data-testid="skeleton" />
      <Empty title="暂无数据" description="请调整筛选条件" />
    </>,
  );

  expect(screen.getByText('正常')).toHaveClass('bg-success-bg');
  expect(screen.getByTestId('badge-dot')).toBeInTheDocument();
  expect(screen.getByTestId('skeleton')).toHaveAttribute('data-slot', 'skeleton');
  expect(screen.getByText('暂无数据')).toBeInTheDocument();
});
