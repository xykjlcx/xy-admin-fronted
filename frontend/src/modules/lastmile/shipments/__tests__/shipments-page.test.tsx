import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { vi } from 'vitest';
import { i18nInit } from '@/lib/i18n';
import { ShipmentsScene } from '../list/ShipmentsScene';
import { shipmentHandlers } from '../mocks';

const server = setupServer(...shipmentHandlers);
beforeAll(async () => {
  await i18nInit;
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('运单列表用紧凑摘要条和统一工具栏展示状态与筛选', async () => {
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <ShipmentsScene
        permissions={['*:*:*']}
        search={{ keyword: '', status: 'all' }}
        onSearchChange={vi.fn()}
        onNavigate={vi.fn()}
      />
    </QueryClientProvider>,
  );

  expect(await screen.findByText('待打单')).toBeInTheDocument();
  expect(screen.getByText('运输中')).toBeInTheDocument();
  expect(screen.getByText('已签收')).toBeInTheDocument();
  expect(screen.getByText('异常/退件')).toBeInTheDocument();
  expect(container.querySelector('[data-slot="summary-strip"]')).toBeInTheDocument();
  expect(screen.getByRole('toolbar', { name: '运单筛选' })).toBeInTheDocument();
  expect(container.querySelector('[data-slot="card"]')).not.toBeInTheDocument();
});
