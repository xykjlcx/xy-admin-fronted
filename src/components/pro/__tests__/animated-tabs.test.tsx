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
  expect(document.querySelector('[data-slot="animated-tabs"]')).toHaveClass('border-(--tabs-line-border)');
  expect(document.querySelector('[data-slot="animated-tabs-indicator"]')).toHaveClass('bg-(--tabs-line-indicator)');
  expect(screen.getByRole('tab', { name: '角色与权限' })).not.toHaveClass('border-(--tabs-line-indicator)');
  expect(screen.getByRole('tab', { name: '角色与权限' })).toHaveClass('text-(--tabs-line-trigger-fg-active)');
  expect(screen.getByRole('tab', { name: '管理员权限' })).toHaveClass('text-(--tabs-line-trigger-fg)');
  expect(screen.getByRole('tab', { name: '管理员权限' })).toHaveClass('hover:text-(--tabs-line-trigger-fg-hover)');
  expect(screen.getByRole('tab', { name: '角色与权限' })).toHaveClass('focus-visible:ring-(--tabs-ring)');
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
