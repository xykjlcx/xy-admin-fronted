import { setupServer } from 'msw/node';
import { channelHandlers, channelDb } from '@/modules/lastmile/channels/mocks';
const server = setupServer(...channelHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  channelDb.reset();
});
afterAll(() => server.close());
test('渠道可创建、测试连接和停用', async () => {
  const created = await (
    await fetch('/api/lastmile/channels', {
      method: 'POST',
      body: JSON.stringify({
        name: '测试渠道',
        code: 'TEST-DHL',
        kind: 'express',
        supplierId: 'sup-001',
        carrierId: 'car-001',
        service: 'DHL Paket',
        countries: ['DE'],
        accountOwner: 'platform',
        settlement: '月结',
        priority: 10,
        baseUrl: 'https://api.example.com',
        apiKey: 'mock-key',
        labelFormat: 'PDF',
        timeout: 30,
      }),
    })
  ).json();
  expect(created.data.name).toBe('测试渠道');
  const tested = await (
    await fetch(`/api/lastmile/channels/${created.data.id}/test`, { method: 'POST' })
  ).json();
  expect(tested.data.ok).toBe(true);
  const toggled = await (
    await fetch(`/api/lastmile/channels/${created.data.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    })
  ).json();
  expect(toggled.data.enabled).toBe(false);
});

test('已有渠道的结算模式可被编辑表单回读', async () => {
  const detail = await (await fetch('/api/lastmile/channels/ch-001')).json();

  expect(['月结', '预付']).toContain(detail.data.settlement);
});

test('渠道运营指标来自全量数据，不随列表筛选条件漂移', async () => {
  const all = await (await fetch('/api/lastmile/channels?keyword=&kind=all&status=all')).json();
  const disabled = await (
    await fetch('/api/lastmile/channels?keyword=&kind=all&status=disabled')
  ).json();

  expect(all.data.stats.enabled).toBe(6);
  expect(disabled.data.total).toBe(1);
  expect(disabled.data.stats).toEqual(all.data.stats);
});
