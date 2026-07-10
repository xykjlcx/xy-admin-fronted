import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, vi } from 'vitest';
import { DeptFormDialog } from '@/modules/admin/users/form/DeptFormDialog';
import type { DeptDto } from '@/modules/admin/users/api';
import { i18nInit } from '@/lib/i18n';

const formDepts: DeptDto[] = [{ id: 'rd', parentId: null, name: '研发', sort: 1, memberCount: 0 }];

beforeAll(async () => {
  await i18nInit;
});

test('dept save button stays disabled while the submit is in flight and re-enables on completion', async () => {
  let resolveSubmit!: () => void;
  const pending = new Promise<void>((resolve) => {
    resolveSubmit = resolve;
  });
  const onCreateDept = vi.fn(() => pending);

  render(
    <DeptFormDialog
      state={{ kind: 'create' }}
      depts={formDepts}
      onOpenChange={() => undefined}
      onCreateDept={onCreateDept}
      onUpdateDept={() => undefined}
    />,
  );

  await userEvent.type(screen.getByPlaceholderText('部门名称'), '新部门');
  const saveButton = screen.getByRole('button', { name: '保存' });
  await waitFor(() => expect(saveButton).toBeEnabled());

  await userEvent.click(saveButton);
  // 提交进行中：按钮应保持 disabled，且回调只触发一次（防慢网连点创建两个部门）
  await waitFor(() => expect(saveButton).toBeDisabled());
  expect(onCreateDept).toHaveBeenCalledTimes(1);

  resolveSubmit();
  await waitFor(() => expect(saveButton).toBeEnabled());
});
