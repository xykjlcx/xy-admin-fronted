import { setupServer } from 'msw/node';
import { supplierHandlers, supplierDb } from '@/modules/lastmile/suppliers/mocks';
const server = setupServer(...supplierHandlers);
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  supplierDb.reset();
});
afterAll(() => server.close());
test('新增供应商后出现在列表', async () => {
  await fetch('/api/lastmile/suppliers', {
    method: 'POST',
    body: JSON.stringify({
      code: 'TEST',
      name: '测试供应商',
      type: '渠道聚合商',
      carriers: 'DHL',
      credentialLabel: '测试账号',
      baseUrl: 'https://api.example.com',
      settlement: '月结',
    }),
  });
  const result = await (await fetch('/api/lastmile/suppliers?keyword=测试')).json();
  expect(result.data.total).toBe(1);
});
