import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupServer } from 'msw/node';
import { vi } from 'vitest';
import { i18nInit } from '@/lib/i18n';
import { ChannelDetailPage, ChannelFormPage } from '..';
import { ChannelsScene } from '../list/ChannelsScene';
import { channelHandlers } from '../mocks';

const server = setupServer(...channelHandlers);
beforeAll(async () => {
  await i18nInit;
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function provider(children: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

test('物流渠道展示原型中的渠道运营指标', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChannelsScene
        permissions={['*:*:*']}
        keyword=""
        kind="all"
        status="all"
        onFiltersChange={vi.fn()}
        onNavigate={vi.fn()}
      />
    </QueryClientProvider>,
  );

  expect(await screen.findByText('已启用渠道')).toBeInTheDocument();
  expect(screen.getByText('覆盖国家/区域')).toBeInTheDocument();
  expect(screen.getByText('今日打单量')).toBeInTheDocument();
  expect(screen.getByText('API 成功率')).toBeInTheDocument();
});

test('渠道表单保存草稿后重新进入仍恢复未提交内容', async () => {
  localStorage.clear();
  const first = render(provider(<ChannelFormPage onBack={vi.fn()} onSaved={vi.fn()} />));
  const name = await screen.findByRole('textbox', { name: '渠道名称' });
  await userEvent.type(name, '待确认德国渠道');
  await userEvent.click(screen.getByRole('button', { name: '保存草稿' }));
  first.unmount();

  render(provider(<ChannelFormPage onBack={vi.fn()} onSaved={vi.fn()} />));
  expect(await screen.findByRole('textbox', { name: '渠道名称' })).toHaveValue('待确认德国渠道');
});

test('渠道详情请求失败时展示可恢复错误，而不是空白页', async () => {
  render(
    provider(
      <ChannelDetailPage id="missing-channel" permissions={['*:*:*']} onBack={vi.fn()} onEdit={vi.fn()} />,
    ),
  );

  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
});
