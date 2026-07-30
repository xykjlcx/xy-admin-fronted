import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { vi } from 'vitest';
import { i18nInit } from '@/lib/i18n';
import { ShipmentDetailScene } from '../detail/ShipmentDetailScene';
import { shipmentHandlers } from '../mocks';

const server = setupServer(...shipmentHandlers);

beforeAll(async () => {
  await i18nInit;
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('运单详情把关键上下文连续铺在详情工作台中', async () => {
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <ShipmentDetailScene id="s-001" onBack={vi.fn()} onPrint={vi.fn()} onTrack={vi.fn()} />
    </QueryClientProvider>,
  );

  expect(await screen.findByRole('heading', { name: 'MM26063001' })).toBeInTheDocument();
  expect(container.querySelector('[data-slot="detail-header"]')).toBeInTheDocument();
  expect(container.querySelector('[data-slot="detail-workspace"]')).toBeInTheDocument();
  expect(container.querySelector('[data-slot="detail-aside"]')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '发件信息' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '收件信息' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '包裹信息' })).toBeInTheDocument();
  expect(container.querySelector('[role="tablist"]')).not.toBeInTheDocument();
  expect(container.querySelector('[data-slot="card"]')).not.toBeInTheDocument();
});
