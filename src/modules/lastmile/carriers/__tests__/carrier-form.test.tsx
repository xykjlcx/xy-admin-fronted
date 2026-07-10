import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { i18nInit } from '@/lib/i18n';
import { CarrierFormDialog } from '../form';

beforeAll(async () => {
  await i18nInit;
});

test('承运商表单的可见标签与输入框关联', () => {
  render(<CarrierFormDialog open submitting={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

  expect(screen.getByRole('textbox', { name: '承运商名称' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '承运商编码' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '服务代码' })).toBeInTheDocument();
});
