import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { i18nInit } from '@/lib/i18n';
import { SupplierFormDialog } from '../form';

beforeAll(async () => {
  await i18nInit;
});

test('供应商表单的可见标签与输入框关联', () => {
  render(<SupplierFormDialog open submitting={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

  expect(screen.getByRole('textbox', { name: '供应商名称' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '供应商编码' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '接入凭证 / 账号' })).toBeInTheDocument();
});
