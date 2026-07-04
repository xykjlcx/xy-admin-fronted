import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AnimatedTabs } from '@/components/pro/AnimatedTabs';

test('AnimatedTabs 渲染可访问 tab 并提供动画指示条', () => {
  render(
    <AnimatedTabs
      value="roles"
      items={[
        { value: 'roles', label: '角色与权限' },
        { value: 'admins', label: '管理员权限' },
      ]}
      onValueChange={vi.fn()}
    />,
  );

  expect(screen.getByRole('tab', { name: '角色与权限', selected: true })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: '管理员权限', selected: false })).toBeInTheDocument();
  expect(document.querySelector('[data-slot="animated-tabs-indicator"]')).toHaveClass(
    'transition-[transform,width,opacity]',
  );
});

test('AnimatedTabs 支持方向键切换', async () => {
  const onValueChange = vi.fn();
  render(
    <AnimatedTabs
      value="roles"
      items={[
        { value: 'roles', label: '角色与权限' },
        { value: 'admins', label: '管理员权限' },
      ]}
      onValueChange={onValueChange}
    />,
  );

  screen.getByRole('tab', { name: '角色与权限' }).focus();
  await userEvent.keyboard('{ArrowRight}');

  expect(onValueChange).toHaveBeenCalledWith('admins');
});
