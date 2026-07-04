import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { vi } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Empty } from '@/components/ui/empty';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SelectControl } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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

test('DialogContent 默认不会被外部点击关闭', async () => {
  const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  const onOpenChange = vi.fn();
  const { container } = render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>编辑资料</DialogTitle>
        <div>Dialog body</div>
      </DialogContent>
    </Dialog>,
  );

  await user.click(container.querySelector('[data-slot="dialog-overlay"]')!);

  expect(onOpenChange).not.toHaveBeenCalledWith(false);
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

test('DialogContent 和 SheetContent 使用统一关闭按钮视觉', () => {
  const { unmount } = render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>编辑成员</DialogTitle>
        <div>Dialog body</div>
      </DialogContent>
    </Dialog>,
  );

  const dialogClose = screen.getByRole('button', { name: 'Close' });
  expect(dialogClose).toHaveClass('size-[calc(30px*var(--app-scale))]');
  expect(dialogClose).toHaveClass('rounded-7');
  expect(dialogClose).toHaveClass('text-text-3');
  expect(dialogClose).toHaveClass('transition-colors');
  expect(dialogClose).toHaveClass('hover:bg-bg');
  expect(dialogClose.querySelector('svg')).toHaveClass('size-[calc(18px*var(--app-scale))]');

  unmount();

  render(
    <Sheet open>
      <SheetContent>
        <SheetTitle>外观设置</SheetTitle>
        <div>Sheet body</div>
      </SheetContent>
    </Sheet>,
  );

  const sheetClose = screen.getByRole('button', { name: 'Close' });
  expect(sheetClose).toHaveClass('size-[calc(30px*var(--app-scale))]');
  expect(sheetClose).toHaveClass('rounded-7');
  expect(sheetClose).toHaveClass('text-text-3');
  expect(sheetClose).toHaveClass('transition-colors');
  expect(sheetClose).toHaveClass('hover:bg-bg');
  expect(sheetClose.querySelector('svg')).toHaveClass('size-[calc(18px*var(--app-scale))]');
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

test('交互型基础组件统一使用设计体系 focus ring token', () => {
  render(
    <>
      <Button>保存</Button>
      <Input aria-label="姓名" />
      <Input aria-label="网址" addonBefore="https://" />
      <NativeSelect aria-label="状态">
        <option>启用</option>
      </NativeSelect>
      <SelectControl
        aria-label="部门"
        value=""
        options={[{ value: '', label: '请选择部门' }]}
        onValueChange={vi.fn()}
      />
      <Textarea aria-label="备注" />
      <RadioGroup defaultValue="enabled">
        <RadioGroupItem aria-label="启用" value="enabled" />
      </RadioGroup>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
        </TabsList>
      </Tabs>
    </>,
  );

  expect(screen.getByRole('button', { name: '保存' })).toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
  expect(screen.getByRole('textbox', { name: '姓名' })).toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
  expect(screen.getByRole('textbox', { name: '网址' }).closest('[data-slot="input-group"]')).toHaveClass(
    'focus-within:ring-[length:var(--focus-ring)]',
  );
  expect(screen.getByRole('textbox', { name: '网址' }).closest('[data-slot="input-group"]')).toHaveClass('ui-field');
  expect(screen.getByRole('combobox', { name: '状态' })).toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
  expect(screen.getByRole('combobox', { name: '部门' })).toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
  expect(screen.getByRole('textbox', { name: '备注' })).toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
  expect(screen.getByRole('radio', { name: '启用' })).toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
  expect(screen.getByRole('tab', { name: '概览' })).toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
});

test('交互型基础组件统一使用 pointer 光标', () => {
  render(
    <>
      <Button>保存</Button>
      <Checkbox aria-label="选择成员" />
      <SelectControl
        aria-label="部门"
        value=""
        options={[{ value: '', label: '请选择部门' }]}
        onValueChange={vi.fn()}
      />
      <Switch aria-label="是否启用" />
      <RadioGroup defaultValue="enabled">
        <RadioGroupItem aria-label="启用" value="enabled" />
      </RadioGroup>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
        </TabsList>
      </Tabs>
    </>,
  );

  expect(screen.getByRole('button', { name: '保存' })).toHaveClass('cursor-pointer');
  expect(screen.getByRole('checkbox', { name: '选择成员' })).toHaveClass('cursor-pointer');
  expect(screen.getByRole('combobox', { name: '部门' })).toHaveClass('cursor-pointer');
  expect(screen.getByRole('switch', { name: '是否启用' })).toHaveClass('cursor-pointer');
  expect(screen.getByRole('radio', { name: '启用' })).toHaveClass('cursor-pointer');
  expect(screen.getByRole('tab', { name: '概览' })).toHaveClass('cursor-pointer');
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
