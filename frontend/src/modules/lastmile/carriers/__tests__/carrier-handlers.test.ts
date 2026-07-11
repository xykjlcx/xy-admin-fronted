import { setupServer } from 'msw/node';
import { carrierHandlers, carrierDb } from '@/modules/lastmile/carriers/mocks';
const server = setupServer(...carrierHandlers);
beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  carrierDb.reset();
});
afterAll(() => server.close());
test('新增承运商后出现在列表', async () => {
  await fetch('/api/lastmile/carriers', {
    method: 'POST',
    body: JSON.stringify({
      code: 'TEST',
      name: '测试承运商',
      fullName: '测试承运商有限公司',
      region: '欧洲',
      serviceName: '标准服务',
      serviceCode: 'TEST-STD',
    }),
  });
  const result = await (await fetch('/api/lastmile/carriers?keyword=测试')).json();
  expect(result.total).toBe(1);
});
test('缺失承运商返回 ProblemDetail', async () => {
  const response = await fetch('/api/lastmile/carriers/missing');
  expect(response.status).toBe(404); expect(response.headers.get('content-type')).toContain('application/problem+json');
  await expect(response.json()).resolves.toMatchObject({ status: 404, code: 'lastmile.carrier.not-found', detail: '承运商不存在' });
});
