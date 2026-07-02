import { http } from '@/lib/http/client';
import { BizError, AuthExpiredError } from '@/lib/http/errors';
import { authEvents } from '@/lib/http/events';
import { setupServer } from 'msw/node';
import { http as mswHttp, HttpResponse } from 'msw';

const server = setupServer(
  mswHttp.get('/api/ok', () => HttpResponse.json({ code: 0, data: { id: 1 }, message: '' })),
  mswHttp.get('/api/biz-err', () => HttpResponse.json({ code: 4001, data: null, message: '余额不足' })),
  mswHttp.get('/api/expired', () => new HttpResponse(null, { status: 401 })),
  mswHttp.get('/api/params', ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({ code: 0, data: Object.fromEntries(url.searchParams), message: '' });
  }),
);
beforeAll(() => server.listen());
afterAll(() => server.close());

test('code=0 拆包返回 data', async () => {
  await expect(http.get('/api/ok')).resolves.toEqual({ id: 1 });
});
test('code!=0 抛 BizError 带 message', async () => {
  await expect(http.get('/api/biz-err')).rejects.toThrow(BizError);
});
test('401 抛 AuthExpiredError 并发布 auth:expired 事件', async () => {
  const spy = vi.fn();
  authEvents.on('expired', spy);
  await expect(http.get('/api/expired')).rejects.toThrow(AuthExpiredError);
  expect(spy).toHaveBeenCalled();
});
test('number 类型 params 正确字符串化，不产生 page=undefined', async () => {
  await expect(http.get('/api/params', { page: 1, size: 10 })).resolves.toEqual({
    page: '1',
    size: '10',
  });
});
