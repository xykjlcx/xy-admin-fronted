import { http } from '@/lib/http/client';
import { AuthExpiredError, ContractError, HttpError } from '@/lib/http/errors';
import { authEvents } from '@/lib/http/events';
import { setupServer } from 'msw/node';
import { http as mswHttp, HttpResponse } from 'msw';
import { z } from 'zod';
import { defineApiContract } from '@/lib/http/contract';

// contract 现为必填参数：对“在契约校验前就失败”的用例（401/500/网络错等），
// 用宽松的 anyContract 占位——这些请求根本走不到契约校验分支。
const anyContract = defineApiContract({ response: z.unknown() });
const idContract = defineApiContract({ response: z.object({ id: z.number() }) });
const paramsContract = defineApiContract({ response: z.record(z.string(), z.string()) });

const server = setupServer(
  mswHttp.get('/api/ok', () => HttpResponse.json({ code: 0, data: { id: 1 }, message: '' })),
  mswHttp.get('/api/contract-ok', () => HttpResponse.json({ code: 0, data: { id: 'u1' }, message: '' })),
  mswHttp.get('/api/contract-bad', () => HttpResponse.json({ code: 0, data: { id: 1 }, message: '' })),
  mswHttp.get('/api/biz-err', () => HttpResponse.json({ code: 4001, data: null, message: '余额不足' })),
  mswHttp.get('/api/expired', () => new HttpResponse(null, { status: 401 })),
  mswHttp.get('/api/server-err', () => new HttpResponse(null, { status: 500 })),
  mswHttp.get('/api/bad-shape', () => HttpResponse.json({ foo: 'bar' })),
  mswHttp.get('/api/network-err', () => HttpResponse.error()),
  mswHttp.get(
    '/api/invalid-json',
    () => new HttpResponse('not json', { headers: { 'Content-Type': 'application/json' } }),
  ),
  mswHttp.get('/api/params', ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json({ code: 0, data: Object.fromEntries(url.searchParams), message: '' });
  }),
  mswHttp.get('/api/slow', async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return HttpResponse.json({ code: 0, data: { ok: true }, message: '' });
  }),
);
beforeAll(() => server.listen());
afterAll(() => server.close());

test('code=0 拆包返回 data', async () => {
  await expect(http.get('/api/ok', undefined, idContract)).resolves.toEqual({ id: 1 });
});
test('code!=0 抛 BizError 带 message（守拆包载荷）', async () => {
  await expect(http.get('/api/biz-err', undefined, anyContract)).rejects.toMatchObject({
    code: 4001,
    message: '余额不足',
  });
});
test('401 抛 AuthExpiredError 并发布 auth:expired 事件（默认 on401=expire）', async () => {
  const spy = vi.fn();
  const off = authEvents.on('expired', spy);
  await expect(http.get('/api/expired', undefined, anyContract)).rejects.toThrow(AuthExpiredError);
  expect(spy).toHaveBeenCalled();
  off();
});
test('on401=reject: 抛 HttpError(401)，不广播 expired、不抛 AuthExpiredError', async () => {
  const spy = vi.fn();
  const off = authEvents.on('expired', spy);
  const rejected = http.get('/api/expired', undefined, anyContract, { on401: 'reject' });
  await expect(rejected).rejects.toBeInstanceOf(HttpError);
  await expect(rejected).rejects.toMatchObject({ status: 401 });
  await expect(rejected).rejects.not.toBeInstanceOf(AuthExpiredError);
  expect(spy).not.toHaveBeenCalled();
  off();
});
test('500 抛 HttpError 且 status=500', async () => {
  await expect(http.get('/api/server-err', undefined, anyContract)).rejects.toMatchObject({ status: 500 });
});
test('200 但响应体非 envelope 形状 → 抛 HttpError（防伪装成空 BizError）', async () => {
  await expect(http.get('/api/bad-shape', undefined, anyContract)).rejects.toThrow(HttpError);
});
test('网络错误（无响应）→ 抛 HttpError', async () => {
  await expect(http.get('/api/network-err', undefined, anyContract)).rejects.toThrow(HttpError);
});
test('响应体不是合法 JSON → 抛 HttpError，message 为 invalid json response', async () => {
  await expect(http.get('/api/invalid-json', undefined, anyContract)).rejects.toMatchObject({
    message: 'invalid json response',
  });
});
test('number 类型 params 正确字符串化，undefined 值被跳过，不产生 page=undefined/keyword=undefined', async () => {
  const data = await http.get('/api/params', { page: 1, size: 10, keyword: undefined }, paramsContract);
  expect(data).toEqual({ page: '1', size: '10' });
  expect('keyword' in data).toBe(false);
});
test('response contract validates successful envelope data', async () => {
  const contract = defineApiContract({ response: z.object({ id: z.string() }) });

  await expect(http.get('/api/contract-ok', undefined, contract)).resolves.toEqual({ id: 'u1' });
  await expect(http.get('/api/contract-bad', undefined, contract)).rejects.toThrow(ContractError);
});

test('request timeout aborts slow requests with a stable HttpError', async () => {
  await expect(http.get('/api/slow', undefined, anyContract, { timeoutMs: 1 })).rejects.toMatchObject({
    status: 0,
    message: 'request timeout',
  });
});

test('caller abort signal aborts requests with a stable HttpError', async () => {
  const controller = new AbortController();
  controller.abort();

  await expect(
    http.get('/api/ok', undefined, anyContract, { signal: controller.signal }),
  ).rejects.toMatchObject({
    status: 0,
    message: 'request aborted',
  });
});
