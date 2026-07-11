import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { registrationHandlers } from '@/modules/admin/auth/mocks';
import { sessionHandlers } from '@/modules/admin/auth/mocks/session.handlers';

const server = setupServer(...registrationHandlers, ...sessionHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => resetDb());
afterAll(() => server.close());
async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}

test('可注册新账号且邮箱必须唯一', async () => {
  const body = { name: '周测试', email: 'zhou@example.com', password: 'Secure123', agree: true };
  const created = await readJson<{ email: string }>(
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  expect(created.email).toBe('zhou@example.com');
  const duplicated = await readJson<{ code: string; detail: string }>(
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  expect(duplicated.code).not.toBe(0);
  expect(duplicated.detail).toContain('邮箱');
});

test('新注册账号可立即登录并读取个人身份', async () => {
  await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '周测试', email: 'zhou@example.com', password: 'Secure123', agree: true }),
  });
  const login = await readJson<{ token: string }>(
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'zhou@example.com', password: 'Secure123' }),
    }),
  );
  const me = await readJson<{ user: { name: string }; roles: string[] }>(
    await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${login.token}` } }),
  );
  expect(me).toMatchObject({ user: { name: '周测试' }, roles: ['viewer'] });
});

test('找回密码仅接受已注册邮箱并生成 Mock 重置请求', async () => {
  const existing = await readJson<{ email: string; expiresInMinutes: number }>(
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'leah@acme.com' }),
    }),
  );
  expect(existing).toEqual({ email: 'leah@acme.com', expiresInMinutes: 30 });
  const missing = await readJson<{ code: string; detail: string }>(
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.com' }),
    }),
  );
  expect(missing.code).not.toBe(0);
});

test('短信验证码与扫码登录都生成可读取身份的会话', async () => {
  const sent = await readJson<{ expiresInSeconds: number }>(
    await fetch('/api/auth/sms-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800138000' }),
    }),
  );
  expect(sent.expiresInSeconds).toBe(60);

  const sms = await readJson<{ token: string }>(
    await fetch('/api/auth/sms-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800138000', code: '123456' }),
    }),
  );
  const qr = await readJson<{ token: string }>(await fetch('/api/auth/qr-login', { method: 'POST' }));
  expect(sms.token).toMatch(/^mock-token-u1-/);
  expect(qr.token).toMatch(/^mock-token-u1-/);
});
