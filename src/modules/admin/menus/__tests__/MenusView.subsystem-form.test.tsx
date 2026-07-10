import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { chooseSelectOption, renderMenusView } from './menus-view.test-kit';

test('admin 可以编辑子系统显示信息', async () => {
  const onUpdateSubsystem = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onUpdateSubsystem });

  await userEvent.click(screen.getByRole('button', { name: '编辑后台管理子系统' }));
  const dialog = screen.getByRole('dialog', { name: '编辑子系统' });
  await userEvent.clear(within(dialog).getByLabelText('子系统名称'));
  await userEvent.type(within(dialog).getByLabelText('子系统名称'), '基础后台');
  await userEvent.clear(within(dialog).getByLabelText('子系统描述'));
  await userEvent.type(within(dialog).getByLabelText('子系统描述'), '组织权限与审计');
  await userEvent.click(within(dialog).getByRole('button', { name: '保存子系统' }));

  expect(onUpdateSubsystem).toHaveBeenCalledWith(
    'admin',
    expect.objectContaining({
      label: { 'zh-CN': '基础后台' },
      desc: { 'zh-CN': '组织权限与审计' },
    }),
  );
});

test('admin 可以新增子系统并显式选择首页', async () => {
  const onCreateSubsystem = vi.fn();
  renderMenusView({ permissions: ['*:*:*'], onCreateSubsystem });

  await userEvent.click(screen.getByRole('button', { name: '新增子系统' }));
  const dialog = screen.getByRole('dialog', { name: '新增子系统' });
  await userEvent.type(within(dialog).getByLabelText('子系统标识'), 'wms');
  await userEvent.type(within(dialog).getByLabelText('子系统名称'), '仓储执行');
  await userEvent.type(within(dialog).getByLabelText('子系统描述'), '库存 · 波次 · 拣货');
  await chooseSelectOption('子系统首页', '运营概览 · /lastmile/overview');
  await userEvent.click(within(dialog).getByRole('button', { name: '保存子系统' }));

  expect(onCreateSubsystem).toHaveBeenCalledWith(
    expect.objectContaining({ key: 'wms', home: '/lastmile/overview', builtin: false, enabled: true }),
  );
});

test('子系统创建提交在途时禁用保存按钮', async () => {
  let release!: () => void;
  const onCreateSubsystem = vi.fn(
    () => new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  renderMenusView({ permissions: ['*:*:*'], onCreateSubsystem });

  await userEvent.click(screen.getByRole('button', { name: '新增子系统' }));
  const dialog = screen.getByRole('dialog', { name: '新增子系统' });
  await userEvent.type(within(dialog).getByLabelText('子系统标识'), 'wms');
  await userEvent.type(within(dialog).getByLabelText('子系统名称'), '仓储执行');
  await userEvent.type(within(dialog).getByLabelText('子系统描述'), '库存 · 波次 · 拣货');
  await chooseSelectOption('子系统首页', '运营概览 · /lastmile/overview');
  const saveButton = within(dialog).getByRole('button', { name: '保存子系统' });
  await userEvent.click(saveButton);

  expect(saveButton).toBeDisabled();
  expect(onCreateSubsystem).toHaveBeenCalledTimes(1);
  release();
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '新增子系统' })).not.toBeInTheDocument());
});
