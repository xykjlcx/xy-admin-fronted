import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import {
  AdvancedFilter,
  type AdvancedFilterCondition,
  type AdvancedFilterField,
} from '@/components/pro/AdvancedFilter';

const fields: AdvancedFilterField[] = [
  {
    value: 'name',
    label: '姓名',
    input: 'text',
    operators: [
      { value: 'contains', label: '包含' },
      { value: 'eq', label: '等于' },
    ],
  },
  {
    value: 'status',
    label: '账号状态',
    input: 'select',
    operators: [{ value: 'eq', label: '等于' }],
    options: [
      { value: 'active', label: '正常' },
      { value: 'disabled', label: '停用' },
    ],
  },
];

const labels = {
  button: '高级筛选',
  activeButton: '高级筛选 {{count}}',
  title: '高级筛选',
  add: '添加条件',
  clear: '清空',
  field: '字段',
  operator: '条件',
  value: '值',
  valuePlaceholder: '请输入',
  remove: '删除条件',
  empty: '暂无筛选条件',
};

test('AdvancedFilter adds a configured condition and reports changes', async () => {
  const onChange = vi.fn();
  render(<AdvancedFilter fields={fields} value={[]} labels={labels} onChange={onChange} />);

  await userEvent.click(screen.getByRole('button', { name: '高级筛选' }));
  expect(screen.getByText('暂无筛选条件')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '添加条件' }));

  expect(onChange).toHaveBeenCalledTimes(1);
  const next = onChange.mock.calls[0]?.[0] as AdvancedFilterCondition[];
  expect(next).toEqual([
    expect.objectContaining({ field: 'name', operator: 'contains', value: '' }),
  ]);
});

test('AdvancedFilter edits values and uses select options for configured fields', async () => {
  const onChange = vi.fn();
  const value: AdvancedFilterCondition[] = [
    { id: 'c1', field: 'status', operator: 'eq', value: 'active' },
  ];
  render(<AdvancedFilter fields={fields} value={value} labels={labels} onChange={onChange} />);

  await userEvent.click(screen.getByRole('button', { name: '高级筛选 1' }));

  const condition = screen.getByRole('group', { name: '账号状态' });
  await userEvent.click(within(condition).getByRole('combobox', { name: '值 正常' }));
  await userEvent.click(screen.getByRole('option', { name: '停用' }));

  expect(onChange).toHaveBeenCalledWith([
    { id: 'c1', field: 'status', operator: 'eq', value: 'disabled' },
  ]);
});

test('AdvancedFilter keeps filter control styles in the Pro layer', async () => {
  render(<AdvancedFilter fields={fields} value={[]} labels={labels} onChange={vi.fn()} />);

  const trigger = screen.getByRole('button', { name: '高级筛选' });
  expect(trigger).toHaveClass('border-(--field-border)');
  expect(trigger).toHaveClass('bg-(--field-bg)');
  expect(trigger).toHaveClass('hover:border-(--field-border-hover)');
  expect(trigger).not.toHaveClass('bg-surface-2');
});
