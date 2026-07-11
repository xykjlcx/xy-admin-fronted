import { setupServer } from 'msw/node';
import { shipmentHandlers, shipmentDb } from '@/modules/lastmile/shipments/mocks';

const server = setupServer(...shipmentHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  shipmentDb.reset();
});
afterAll(() => server.close());

test('新建运单后可从详情接口回读并推进到已打单', async () => {
  const created = await (
    await fetch('/api/lastmile/shipments', {
      method: 'POST',
      body: JSON.stringify({
        customerId: 'c-001',
        warehouse: '深圳坂田保税仓',
        recipient: 'Anna',
        phone: '+49123456',
        country: '德国 DE',
        postalCode: '80331',
        address: 'Marienplatz 8',
        channelId: 'ch-002',
        services: [],
        parcels: [
          {
            name: '耳机',
            hsCode: '8518300000',
            quantity: 1,
            weight: 0.3,
            size: '10×10×10',
            declaredValue: 20,
          },
        ],
      }),
    })
  ).json();
  expect(created.status).toBe('pending');
  const printed = await (
    await fetch(`/api/lastmile/shipments/${created.id}/print`, {
      method: 'POST',
      body: JSON.stringify({ printer: 'Zebra', paper: '100 × 150 mm', copies: 1, packingList: true }),
    })
  ).json();
  expect(printed.shipment.status).toBe('printed');
  expect(printed.shipment.trackingNo).toMatch(/^MOCK/);
});
test('缺失运单返回 ProblemDetail', async () => {
  const response = await fetch('/api/lastmile/shipments/missing');
  expect(response.status).toBe(404); expect(response.headers.get('content-type')).toContain('application/problem+json');
  await expect(response.json()).resolves.toMatchObject({ status: 404, code: 'lastmile.shipment.not-found', detail: '运单不存在' });
});
