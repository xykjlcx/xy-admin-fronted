import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { vi } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Empty } from '@/components/ui/empty';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SelectControl } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

function DemoForm() {
  const form = useForm<{ name: string }>({ defaultValues: { name: '张三' } });

  return (
    <Form {...form}>
      <form>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>姓名</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>用于成员展示</FormDescription>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

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

test('SelectControl 使用自定义下拉层而不是原生 select', async () => {
  const onValueChange = vi.fn();
  const { container } = render(
    <SelectControl
      aria-label="部门"
      aria-invalid
      value=""
      options={[
        { value: '', label: '请选择部门' },
        { value: 'rd', label: '研发部' },
      ]}
      onValueChange={onValueChange}
    />,
  );

  expect(container.querySelector('select')).not.toBeInTheDocument();
  const trigger = screen.getByRole('combobox', { name: '部门' });
  expect(trigger).toHaveAttribute('data-slot', 'select-trigger');
  expect(trigger).toHaveAttribute('aria-invalid', 'true');

  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole('option', { name: '研发部' }));
  expect(onValueChange).toHaveBeenCalledWith('rd');
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

test('Tabs、Table、Textarea、RadioGroup、Alert、Separator 走项目基础 UI token', () => {
  render(
    <>
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="logs">日志</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">概览内容</TabsContent>
      </Tabs>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>姓名</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>张三</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Textarea aria-label="备注" status="error" defaultValue="说明" />

      <RadioGroup defaultValue="enabled">
        <div>
          <RadioGroupItem id="enabled" value="enabled" />
          <Label htmlFor="enabled">启用</Label>
        </div>
      </RadioGroup>

      <Alert variant="success">
        <AlertTitle>保存成功</AlertTitle>
        <AlertDescription>配置已经更新</AlertDescription>
      </Alert>

      <Separator decorative={false} />
    </>,
  );

  expect(screen.getByRole('tab', { name: '概览' })).toHaveClass('text-text-3');
  expect(screen.getByRole('cell', { name: '张三' })).toHaveClass('whitespace-nowrap');
  expect(screen.getByRole('textbox', { name: '备注' })).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('radio', { name: '启用' })).toHaveAttribute('data-state', 'checked');
  expect(screen.getByText('保存成功').closest('[data-slot="alert"]')).toHaveClass('bg-success-bg');
  expect(screen.getByRole('separator')).toHaveAttribute('data-slot', 'separator');
});

test('Form 原语基于 react-hook-form 并保持 label/control 关联', () => {
  render(<DemoForm />);

  const input = screen.getByLabelText('姓名');
  expect(input).toHaveValue('张三');
  expect(input).toHaveAttribute('aria-describedby');
  expect(screen.getByText('用于成员展示')).toHaveAttribute('data-slot', 'form-description');
});
