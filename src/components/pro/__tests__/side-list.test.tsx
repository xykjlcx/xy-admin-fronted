import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { SideCardList } from '@/components/pro/SideList';

test('SideCardList owns selectable card, supporting text and trailing action presentation', async () => {
  const onSelect = vi.fn();

  render(
    <SideCardList
      activeId="admin"
      onSelect={onSelect}
      items={[
        {
          id: 'admin',
          label: '后台管理',
          ariaLabel: '选择后台管理子系统',
          description: '内置 · 已启用',
          icon: <span>图标</span>,
          action: <button type="button">编辑后台管理</button>,
        },
        { id: 'wms', label: '仓储系统', ariaLabel: '选择仓储系统子系统' },
      ]}
    />,
  );

  const active = screen.getByRole('button', { name: '选择后台管理子系统' });
  expect(active).toHaveAttribute('aria-current', 'page');
  expect(active.closest('[data-slot="side-card"]')).toHaveAttribute('data-state', 'active');
  expect(screen.getByText('内置 · 已启用')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '编辑后台管理' })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: '选择仓储系统子系统' }));
  expect(onSelect).toHaveBeenCalledWith('wms');
});
