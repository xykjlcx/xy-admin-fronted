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
  expect(created.name).toBe('测试渠道');
  const tested = await (
    await fetch(`/api/lastmile/channels/${created.id}/test`, { method: 'POST' })
  ).json();
  expect(tested.ok).toBe(true);
  const toggled = await (
    await fetch(`/api/lastmile/channels/${created.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    })
  ).json();
  expect(toggled.enabled).toBe(false);
});

test('已有渠道的结算模式可被编辑表单回读', async () => {
  const detail = await (await fetch('/api/lastmile/channels/ch-001')).json();

  expect(['月结', '预付']).toContain(detail.settlement);
});

test('渠道运营指标来自全量数据，不随列表筛选条件漂移', async () => {
  const all = await (await fetch('/api/lastmile/channels?keyword=&kind=all&status=all')).json();
  const disabled = await (
    await fetch('/api/lastmile/channels?keyword=&kind=all&status=disabled')
  ).json();

  expect(all.stats.enabled).toBe(6);
  expect(disabled.total).toBe(1);
  expect(disabled.stats).toEqual(all.stats);
});
test('缺失渠道返回 ProblemDetail', async () => {
  const response = await fetch('/api/lastmile/channels/missing');
  expect(response.status).toBe(404); expect(response.headers.get('content-type')).toContain('application/problem+json');
  await expect(response.json()).resolves.toMatchObject({ status: 404, code: 'lastmile.channel.not-found', detail: '渠道不存在' });
});
