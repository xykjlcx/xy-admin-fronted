import { http } from '@/lib/http/client';
import { AuthExpiredError, HttpError } from '@/lib/http/errors';
import { authEvents } from '@/lib/http/events';
import { setupServer } from 'msw/node';
import { http as mswHttp, HttpResponse } from 'msw';

const server = setupServer(
  mswHttp.get('/api/ok', () => HttpResponse.json({ code: 0, data: { id: 1 }, message: '' })),
  mswHttp.get('/api/biz-err', () => HttpResponse.json({ code: 4001, data: null, message: '余额不足' })),
  mswHttp.get('/api/expired', () => new HttpResponse(null, { status: 401 })),
  mswHttp.get('/api/server-err', () => new HttpResponse(null, { status: 500 })),
  mswHttp.get('/api/bad-shape', () => HttpResponse.json({ foo: 'bar' })),
  mswHttp.get('/api/network-err', () => HttpResponse.error()),
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
test('code!=0 抛 BizError 带 message（守拆包载荷）', async () => {
  await expect(http.get('/api/biz-err')).rejects.toMatchObject({ code: 4001, message: '余额不足' });
});
test('401 抛 AuthExpiredError 并发布 auth:expired 事件', async () => {
  const spy = vi.fn();
  authEvents.on('expired', spy);
  await expect(http.get('/api/expired')).rejects.toThrow(AuthExpiredError);
  expect(spy).toHaveBeenCalled();
});
test('500 抛 HttpError 且 status=500', async () => {
  await expect(http.get('/api/server-err')).rejects.toMatchObject({ status: 500 });
});
test('200 但响应体非 envelope 形状 → 抛 HttpError（防伪装成空 BizError）', async () => {
  await expect(http.get('/api/bad-shape')).rejects.toThrow(HttpError);
});
test('网络错误（无响应）→ 抛 HttpError', async () => {
  await expect(http.get('/api/network-err')).rejects.toThrow(HttpError);
});
test('number 类型 params 正确字符串化，undefined 值被跳过，不产生 page=undefined/keyword=undefined', async () => {
  const data = await http.get<Record<string, string>>('/api/params', {
    page: 1,
    size: 10,
    keyword: undefined,
  });
  expect(data).toEqual({ page: '1', size: '10' });
  expect('keyword' in data).toBe(false);
});
