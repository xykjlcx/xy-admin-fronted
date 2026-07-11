import { setupServer } from 'msw/node';
import { billingHandlers } from '@/modules/lastmile/billing/mocks';
const server = setupServer(...billingHandlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
test('账单状态筛选返回正确应收合计', async () => {
  const result = await (await fetch('/api/lastmile/billing?status=overdue&keyword=')).json();
  expect(result.total).toBe(1);
  expect(result.receivable).toBe(12180);
});
test('非法账单状态返回 ProblemDetail', async () => {
  const response = await fetch('/api/lastmile/billing?status=bad');
  expect(response.status).toBe(400); expect(response.headers.get('content-type')).toContain('application/problem+json');
  await expect(response.json()).resolves.toMatchObject({ status: 400, code: 'lastmile.billing.status.invalid', detail: '状态不合法' });
});
