import { setupServer } from 'msw/node';
import { billingHandlers } from '@/modules/lastmile/billing/mocks';
const server = setupServer(...billingHandlers);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
test('账单状态筛选返回正确应收合计', async () => {
  const result = await (await fetch('/api/lastmile/billing?status=overdue&keyword=')).json();
  expect(result.data.total).toBe(1);
  expect(result.data.receivable).toBe(12180);
});
