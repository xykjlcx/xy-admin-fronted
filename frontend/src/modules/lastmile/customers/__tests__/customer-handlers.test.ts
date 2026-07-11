import { setupServer } from 'msw/node';
import { customerHandlers, customerDb } from '@/modules/lastmile/customers/mocks';
const server = setupServer(...customerHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  customerDb.reset();
});
afterAll(() => server.close());
test('客户创建和渠道授权均可回读', async () => {
  const created = await (
    await fetch('/api/lastmile/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: '测试客户',
        code: 'C-TEST',
        type: '跨境卖家',
        contact: '测试员',
        phone: '13800000000',
        email: 'test@example.com',
        credit: 5000,
      }),
    })
  ).json();
  expect(created.status).toBe('trial');
  const updated = await (
    await fetch(`/api/lastmile/customers/${created.id}/channels`, {
      method: 'PATCH',
      body: JSON.stringify({ channelId: 'ch-001', authorized: true }),
    })
  ).json();
  expect(updated.channels[0].authorized).toBe(true);
});
test('缺失客户返回 ProblemDetail', async () => {
  const response = await fetch('/api/lastmile/customers/missing');
  expect(response.status).toBe(404); expect(response.headers.get('content-type')).toContain('application/problem+json');
  await expect(response.json()).resolves.toMatchObject({ status: 404, code: 'lastmile.customer.not-found', detail: '客户不存在' });
});
