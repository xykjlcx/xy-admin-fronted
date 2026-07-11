import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { OverviewPage } from '@/modules/lastmile/overview';
import { overviewHandlers } from '@/modules/lastmile/overview/mocks';
import { i18nInit } from '@/lib/i18n';

const server = setupServer(...overviewHandlers);
beforeAll(async () => {
  await i18nInit;
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('运营概览展示指标、最近运单和渠道排行', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OverviewPage />
    </QueryClientProvider>,
  );
  expect(await screen.findByText('待打单运单')).toBeInTheDocument();
  expect(screen.getByText('MM26063001')).toBeInTheDocument();
  expect(screen.getByText('渠道用量 Top 5')).toBeInTheDocument();
});
