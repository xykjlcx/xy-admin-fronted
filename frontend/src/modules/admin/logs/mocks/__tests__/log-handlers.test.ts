import { setupServer } from 'msw/node';
import { logHandlers } from '@/modules/admin/logs/mocks';
import type { LoginLogDto, OperationLogDto } from '@/modules/admin/logs/api';

const server = setupServer(...logHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

interface Env<T> {
  code: number;
  data: T;
}

async function readEnv<T>(response: Response) {
  return (await response.json()) as Env<T>;
}

test('操作日志支持按关键词与操作类型筛选', async () => {
  const response = await fetch('/api/audit/operation-logs?keyword=李长昕&type=perm');
  const result = await readEnv<{ list: OperationLogDto[]; total: number }>(response);

  expect(result.code).toBe(0);
  expect(result.data.total).toBeGreaterThan(0);
  expect(result.data.list.every((item) => item.operator.includes('李长昕') && item.type === 'perm')).toBe(
    true,
  );
});

test('登录日志支持按结果与地点筛选', async () => {
  const response = await fetch('/api/audit/login-logs?keyword=境外&result=fail');
  const result = await readEnv<{ list: LoginLogDto[]; total: number }>(response);

  expect(result.code).toBe(0);
  expect(result.data.total).toBe(2);
  expect(result.data.list.every((item) => item.result === 'fail' && item.location === '境外')).toBe(true);
});

test('日志导出返回与当前筛选一致的 CSV 内容', async () => {
  const response = await fetch('/api/audit/operation-logs/export?type=export');

  expect(response.headers.get('content-type')).toContain('text/csv');
  expect(response.headers.get('content-disposition')).toContain('operation-logs.csv');
  const csv = await response.text();
  expect(csv).toContain('操作时间,操作人,模块,操作类型,操作对象,IP地址');
  expect(csv).toContain('吴俊豪');
  expect(csv).not.toContain('新增成员');
});

test('列表与导出均按起止日期闭区间筛选', async () => {
  const response = await fetch('/api/audit/operation-logs?type=all&startDate=2026-06-30&endDate=2026-06-30');
  const result = await readEnv<{ list: OperationLogDto[]; total: number }>(response);

  expect(result.data.total).toBe(3);
  expect(result.data.list.every((item) => item.occurredAt.startsWith('2026-06-30'))).toBe(true);

  const csv = await (
    await fetch('/api/audit/operation-logs/export?type=all&startDate=2026-06-30&endDate=2026-06-30')
  ).text();
  expect(csv).toContain('新增成员');
  expect(csv).not.toContain('修改企业名称');
});
