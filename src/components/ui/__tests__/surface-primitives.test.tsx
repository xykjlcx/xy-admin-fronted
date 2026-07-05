import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { vi } from 'vitest';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
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

test('DialogContent 使用 overlay token 而不是页面背景', () => {
  render(
    <Dialog open>
      <DialogContent>
        <DialogTitle>确认操作</DialogTitle>
        <div>Dialog body</div>
      </DialogContent>
    </Dialog>,
  );

  const content = screen.getByText('Dialog body').closest('[data-slot="dialog-content"]');
  const overlay = document.querySelector('[data-slot="dialog-overlay"]');
  expect(overlay).toHaveClass('bg-(--overlay-mask-bg)');
  expect(overlay).toHaveClass('backdrop-blur-[var(--overlay-mask-blur)]');
  expect(content).toHaveClass('bg-(--overlay-bg)');
  expect(content).toHaveClass('border-(--overlay-border)');
  expect(content).toHaveClass('shadow-(--overlay-shadow-modal)');
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

test('SheetContent 使用 overlay token 而不是页面背景', () => {
  render(
    <Sheet open>
      <SheetContent>
        <SheetTitle>外观设置</SheetTitle>
        <div>Sheet body</div>
      </SheetContent>
    </Sheet>,
  );

  const content = screen.getByText('Sheet body').closest('[data-slot="sheet-content"]');
  const overlay = document.querySelector('[data-slot="sheet-overlay"]');
  expect(overlay).toHaveClass('bg-(--overlay-mask-bg)');
  expect(overlay).toHaveClass('backdrop-blur-[var(--overlay-mask-blur)]');
  expect(content).toHaveClass('bg-(--overlay-bg)');
  expect(content).toHaveClass('text-(--overlay-fg)');
  expect(content).toHaveClass('shadow-(--shadow-drawer)');
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
  expect(dialogClose).toHaveClass('text-(--overlay-close-fg)');
  expect(dialogClose).toHaveClass('transition-colors');
  expect(dialogClose).toHaveClass('hover:bg-(--overlay-close-bg-hover)');
  expect(dialogClose).toHaveClass('hover:text-(--overlay-close-fg-hover)');
  expect(dialogClose).toHaveClass('focus-visible:ring-(--button-ring)');
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
  expect(sheetClose).toHaveClass('text-(--overlay-close-fg)');
  expect(sheetClose).toHaveClass('transition-colors');
  expect(sheetClose).toHaveClass('hover:bg-(--overlay-close-bg-hover)');
  expect(sheetClose).toHaveClass('hover:text-(--overlay-close-fg-hover)');
  expect(sheetClose).toHaveClass('focus-visible:ring-(--button-ring)');
  expect(sheetClose.querySelector('svg')).toHaveClass('size-[calc(18px*var(--app-scale))]');
});

test('Button 使用后台设计体系变体并兼容 loading 状态', () => {
  render(
    <>
      <Button loading variant="primary">
        保存
      </Button>
      <Button variant="secondary">次按钮</Button>
      <Button variant="outline">描边按钮</Button>
      <Button variant="dashed">虚线按钮</Button>
      <Button variant="text">文字按钮</Button>
      <Button variant="ghost">幽灵按钮</Button>
      <Button variant="link">链接按钮</Button>
      <Button variant="danger">危险按钮</Button>
      <Button variant="destructive">破坏按钮</Button>
      <Button variant="danger-ghost">危险描边</Button>
      <Button variant="ghost" size="icon" aria-label="图标按钮">
        <span data-icon="test" />
      </Button>
      <Button variant="ghost" size="icon" className="text-text-2 hover:text-text-2" aria-label="自定义图标按钮">
        <span data-icon="test" />
      </Button>
    </>,
  );

  const button = screen.getByRole('button', { name: '保存' });
  expect(button).toHaveAttribute('data-variant', 'primary');
  expect(button).toHaveClass('bg-(--button-primary-bg)');
  expect(button).toHaveClass('text-(--button-primary-fg)');
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button).toBeDisabled();
  expect(button.querySelector('[data-slot="button-spinner"]')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '次按钮' })).toHaveClass('border-(--button-secondary-border)');
  expect(screen.getByRole('button', { name: '描边按钮' })).toHaveClass('bg-(--button-secondary-bg)');
  expect(screen.getByRole('button', { name: '虚线按钮' })).toHaveClass('border-(--button-dashed-border)');
  expect(screen.getByRole('button', { name: '文字按钮' })).toHaveClass('text-(--button-text-fg)');
  expect(screen.getByRole('button', { name: '幽灵按钮' })).toHaveClass('text-(--button-ghost-fg)');
  expect(screen.getByRole('button', { name: '链接按钮' })).toHaveClass('text-(--button-link-fg)');
  expect(screen.getByRole('button', { name: '危险按钮' })).toHaveClass('bg-(--button-danger-bg)');
  expect(screen.getByRole('button', { name: '破坏按钮' })).toHaveClass('bg-(--button-danger-bg)');
  expect(screen.getByRole('button', { name: '危险描边' })).toHaveClass('border-(--button-danger-ghost-border)');
  expect(screen.getByRole('button', { name: '图标按钮' })).not.toHaveAttribute('data-icon-button');
  expect(screen.getByRole('button', { name: '图标按钮' })).toHaveClass('text-(--button-icon-fg)');
  expect(screen.getByRole('button', { name: '图标按钮' })).toHaveClass('hover:bg-(--button-icon-bg-hover)');
  expect(screen.getByRole('button', { name: '自定义图标按钮' })).toHaveClass('text-text-2');
  expect(screen.getByRole('button', { name: '自定义图标按钮' })).toHaveClass('hover:text-text-2');
});

test('非 Field 交互组件统一使用设计体系 focus ring token', () => {
  render(
    <>
      <Button>保存</Button>
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
  expect(screen.getByRole('radio', { name: '启用' })).toHaveClass('ui-choice');
  expect(screen.getByRole('radio', { name: '启用' })).not.toHaveClass('focus-visible:ring-(--choice-ring)');
  expect(screen.getByRole('tab', { name: '概览' })).toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
  expect(screen.getByRole('tab', { name: '概览' })).toHaveClass('focus-visible:ring-(--tabs-ring)');
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

test('Field 族控件统一挂载 ui-field 状态机并消费 Field token', () => {
  render(
    <>
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
    </>,
  );

  const input = screen.getByRole('textbox', { name: '姓名' });
  const group = screen.getByRole('textbox', { name: '网址' }).closest('[data-slot="input-group"]');
  const nativeSelect = screen.getByRole('combobox', { name: '状态' });
  const selectTrigger = screen.getByRole('combobox', { name: '部门' });
  const textarea = screen.getByRole('textbox', { name: '备注' });

  for (const control of [input, group, nativeSelect, selectTrigger, textarea]) {
    expect(control).toHaveClass('ui-field');
    expect(control).not.toHaveClass('border-[var(--field-border)]');
    expect(control).not.toHaveClass('bg-[var(--field-bg)]');
    expect(control).not.toHaveClass('text-[var(--field-fg)]');
  }
  expect(group).toHaveAttribute('data-addon-before', 'true');
  expect(group).toHaveClass('overflow-hidden');
  expect(group).toHaveClass('data-[addon-before=true]:pl-0');
  expect(group?.querySelector('[data-slot="input-group-addon"]')).not.toHaveClass('-ml-3');
  expect(input).not.toHaveClass('placeholder:text-[var(--field-placeholder)]');
  expect(group).not.toHaveClass('[&_[data-icon]]:text-[var(--field-icon)]');
  expect(selectTrigger).not.toHaveClass('data-[state=open]:border-[var(--field-border-focus)]');
  expect(textarea).not.toHaveClass('aria-invalid:border-[var(--field-border-invalid)]');
  expect(input).not.toHaveClass('hover:border-[var(--field-border-hover)]');
  expect(group).not.toHaveClass('focus-within:border-[var(--field-border-focus)]');
  expect(nativeSelect).not.toHaveClass('focus-visible:border-[var(--field-border-focus)]');
  expect(selectTrigger).not.toHaveClass('focus-visible:border-[var(--field-border-focus)]');
  expect(textarea).not.toHaveClass('focus-visible:border-[var(--field-border-focus)]');
  expect(input).not.toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
  expect(group).not.toHaveClass('focus-within:ring-[length:var(--focus-ring)]');
  expect(nativeSelect).not.toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
  expect(selectTrigger).not.toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
  expect(selectTrigger).not.toHaveClass('data-[state=open]:ring-[length:var(--focus-ring)]');
  expect(textarea).not.toHaveClass('focus-visible:ring-[length:var(--focus-ring)]');
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

test('SelectItem 与 DropdownMenuItem 分别消费 Option/Menu token', async () => {
  const { unmount } = render(
    <SelectControl
      aria-label="部门"
      value="rd"
      options={[
        { value: 'rd', label: '研发部' },
        { value: 'mk', label: '市场部' },
      ]}
      onValueChange={vi.fn()}
    />,
  );

  await userEvent.click(screen.getByRole('combobox', { name: '部门' }));
  const selectedOption = await screen.findByRole('option', { name: '研发部' });
  expect(selectedOption).toHaveClass('text-(--option-fg)');
  expect(selectedOption).not.toHaveClass('transition-colors');
  expect(selectedOption).toHaveClass('focus:bg-(--option-bg-highlighted)');
  expect(selectedOption).toHaveClass('data-[highlighted]:bg-(--option-bg-highlighted)');
  expect(selectedOption).toHaveClass('data-[highlighted]:text-(--option-fg-highlighted)');
  expect(selectedOption).toHaveClass('data-[state=checked]:bg-(--option-bg-selected)');
  expect(selectedOption).toHaveClass('data-[state=checked]:text-(--option-fg-selected)');
  expect(selectedOption.querySelector('[data-slot="select-item-indicator"]')).toHaveClass('text-(--option-check)');

  unmount();

  render(
    <DropdownMenu open>
      <DropdownMenuContent>
        <DropdownMenuItem>系统设置</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">删除</DropdownMenuItem>
        <DropdownMenuCheckboxItem checked>显示隐藏节点</DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value="compact">
          <DropdownMenuRadioItem value="compact">紧凑</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSub open>
          <DropdownMenuSubTrigger>更多</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>导出</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>,
  );

  const menuItem = screen.getByText('系统设置').closest('[data-slot="dropdown-menu-item"]');
  expect(menuItem).toHaveClass('text-(--menu-item-fg)');
  expect(menuItem).toHaveClass('focus:bg-(--menu-item-bg-highlighted)');
  expect(menuItem).toHaveClass('focus:text-(--menu-item-fg-highlighted)');
  expect(menuItem).toHaveClass('data-[highlighted]:bg-(--menu-item-bg-highlighted)');
  expect(menuItem).toHaveClass('data-[highlighted]:text-(--menu-item-fg-highlighted)');

  const destructiveItem = screen.getByText('删除').closest('[data-slot="dropdown-menu-item"]');
  expect(destructiveItem).toHaveClass('data-[variant=destructive]:text-(--menu-item-fg-danger)');
  expect(destructiveItem).toHaveClass('data-[variant=destructive]:focus:bg-(--menu-item-bg-danger-highlighted)');
  expect(destructiveItem).toHaveClass('data-[variant=destructive]:data-[highlighted]:bg-(--menu-item-bg-danger-highlighted)');

  const checkboxItem = screen.getByText('显示隐藏节点').closest('[data-slot="dropdown-menu-checkbox-item"]');
  expect(checkboxItem).toHaveClass('text-(--menu-item-fg)');
  expect(checkboxItem).toHaveClass('focus:bg-(--menu-item-bg-highlighted)');
  expect(checkboxItem).toHaveClass('data-[highlighted]:bg-(--menu-item-bg-highlighted)');

  const radioItem = screen.getByText('紧凑').closest('[data-slot="dropdown-menu-radio-item"]');
  expect(radioItem).toHaveClass('text-(--menu-item-fg)');
  expect(radioItem).toHaveClass('focus:bg-(--menu-item-bg-highlighted)');
  expect(radioItem).toHaveClass('data-[highlighted]:bg-(--menu-item-bg-highlighted)');

  const subTrigger = screen.getByText('更多').closest('[data-slot="dropdown-menu-sub-trigger"]');
  expect(subTrigger).toHaveClass('text-(--menu-item-fg)');
  expect(subTrigger).toHaveClass('focus:bg-(--menu-item-bg-highlighted)');
  expect(subTrigger).toHaveClass('data-[highlighted]:bg-(--menu-item-bg-highlighted)');
  expect(subTrigger).toHaveClass('data-[state=open]:bg-(--menu-item-bg-highlighted)');
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
  expect(screen.getByTestId('skeleton')).toHaveClass('bg-(--skeleton-bg)');
  expect(screen.getByText('暂无数据')).toBeInTheDocument();
  expect(screen.getByText('请调整筛选条件')).toHaveClass('text-(--empty-fg)');
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

  expect(screen.getByRole('tab', { name: '概览' })).toHaveClass('text-(--tabs-seg-trigger-fg)');
  expect(screen.getByRole('cell', { name: '张三' })).toHaveClass('whitespace-nowrap');
  expect(screen.getByRole('textbox', { name: '备注' })).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('radio', { name: '启用' })).toHaveAttribute('data-state', 'checked');
  expect(screen.getByText('保存成功').closest('[data-slot="alert"]')).toHaveClass('bg-success-bg');
  expect(screen.getByRole('separator')).toHaveAttribute('data-slot', 'separator');
});

test('Tabs 分结构消费 Step 6 token 并保留 line 指示条动画', () => {
  const { unmount } = render(
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">概览</TabsTrigger>
        <TabsTrigger value="logs">日志</TabsTrigger>
      </TabsList>
    </Tabs>,
  );

  const segmentedList = screen.getByRole('tablist');
  const segmentedTrigger = screen.getByRole('tab', { name: '概览' });
  expect(segmentedList).toHaveClass('bg-(--tabs-seg-list-bg)');
  expect(segmentedTrigger).toHaveClass('text-(--tabs-seg-trigger-fg)');
  expect(segmentedTrigger).toHaveClass('hover:text-(--tabs-seg-trigger-fg-hover)');
  expect(segmentedTrigger).toHaveClass('data-[state=active]:bg-(--tabs-seg-trigger-bg-active)');
  expect(segmentedTrigger).toHaveClass('data-[state=active]:text-(--tabs-seg-trigger-fg-active)');
  expect(segmentedTrigger).toHaveClass('data-[state=active]:shadow-(--tabs-seg-trigger-shadow-active)');

  unmount();

  render(
    <Tabs defaultValue="overview">
      <TabsList variant="line">
        <TabsTrigger value="overview">概览</TabsTrigger>
        <TabsTrigger value="logs">日志</TabsTrigger>
      </TabsList>
    </Tabs>,
  );

  const lineList = screen.getByRole('tablist');
  const lineTrigger = screen.getByRole('tab', { name: '概览' });
  expect(lineList).toHaveClass('border-(--tabs-line-border)');
  expect(lineTrigger).toHaveClass('ui-tabs-line-trigger');
  expect(lineTrigger).not.toHaveClass('group-data-[variant=line]/tabs-list:text-(--tabs-line-trigger-fg)');
  expect(lineTrigger).not.toHaveClass('group-data-[variant=line]/tabs-list:hover:text-(--tabs-line-trigger-fg-hover)');
  expect(lineTrigger).not.toHaveClass('group-data-[variant=line]/tabs-list:data-[state=active]:text-(--tabs-line-trigger-fg-active)');
  expect(lineTrigger).toHaveClass('after:bg-(--tabs-line-indicator)');
  expect(lineTrigger).toHaveClass('after:transition-[opacity,transform]');
});

test('Checkbox、RadioGroup、Switch 消费 Choice token 并保留三态区分', () => {
  render(
    <>
      <Checkbox aria-label="选中" checked readOnly />
      <Checkbox aria-label="半选" indeterminate readOnly />
      <Checkbox aria-label="禁用" disabled />
      <RadioGroup defaultValue="enabled">
        <RadioGroupItem aria-label="启用" value="enabled" aria-invalid />
      </RadioGroup>
      <Switch aria-label="开启" defaultChecked />
    </>,
  );

  const checked = screen.getByRole('checkbox', { name: '选中' });
  const indeterminate = screen.getByRole('checkbox', { name: '半选' });
  const disabled = screen.getByRole('checkbox', { name: '禁用' });
  const radio = screen.getByRole('radio', { name: '启用' });
  const switchControl = screen.getByRole('switch', { name: '开启' });

  expect(checked).toHaveClass('ui-choice');
  expect(checked).not.toHaveClass('border-(--choice-border)');
  expect(checked).not.toHaveClass('bg-(--choice-bg)');
  expect(checked).not.toHaveClass('hover:border-(--choice-border-hover)');
  expect(checked).not.toHaveClass('checked:border-(--choice-border-checked)');
  expect(checked).not.toHaveClass('checked:bg-(--choice-bg-checked)');
  expect(checked.nextElementSibling).toHaveClass('text-(--choice-fg-checked)');

  expect(indeterminate).toHaveClass('ui-choice');
  expect(indeterminate).not.toHaveClass('border-(--choice-border-indeterminate)');
  expect(indeterminate).not.toHaveClass('bg-(--choice-bg-indeterminate)');
  expect(indeterminate.nextElementSibling).toHaveClass('text-(--choice-fg-indeterminate)');

  expect(disabled).toHaveClass('ui-choice');
  expect(disabled).not.toHaveClass('disabled:bg-(--choice-bg-disabled)');

  expect(radio).toHaveClass('ui-choice');
  expect(radio).not.toHaveClass('border-(--choice-border)');
  expect(radio).not.toHaveClass('bg-(--choice-bg)');
  expect(radio).not.toHaveClass('focus-visible:border-(--choice-border-hover)');
  expect(radio).not.toHaveClass('focus-visible:ring-(--choice-ring)');
  expect(radio).not.toHaveClass('data-[state=checked]:border-(--choice-border-checked)');
  expect(radio).not.toHaveClass('aria-invalid:border-(--field-border-invalid)');
  expect(radio).not.toHaveClass('data-[state=checked]:aria-invalid:border-(--field-border-invalid)');
  expect(radio).not.toHaveClass('aria-invalid:ring-(--field-ring-invalid)');
  expect(radio.querySelector('[data-icon="radio-indicator"]')).toHaveClass('fill-(--choice-bg-checked)');

  expect(switchControl).toHaveClass('data-[state=checked]:bg-(--switch-bg-checked)');
  expect(switchControl).toHaveClass('data-[state=unchecked]:bg-(--switch-bg)');
  expect(switchControl).toHaveClass('focus-visible:ring-(--choice-ring)');
  expect(switchControl.querySelector('[data-slot="switch-thumb"]')).toHaveClass('bg-(--switch-thumb-bg)');
});

test('Form 原语基于 react-hook-form 并保持 label/control 关联', () => {
  render(<DemoForm />);

  const input = screen.getByLabelText('姓名');
  expect(input).toHaveValue('张三');
  expect(input).toHaveAttribute('aria-describedby');
  expect(screen.getByText('用于成员展示')).toHaveAttribute('data-slot', 'form-description');
});
