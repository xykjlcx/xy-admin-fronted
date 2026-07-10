import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { registrationHandlers } from '@/modules/admin/auth/mocks';
import { sessionHandlers } from '@/modules/admin/auth/mocks/session.handlers';

const server = setupServer(...registrationHandlers, ...sessionHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => resetDb());
afterAll(() => server.close());
interface Env<T> {
  code: number;
  data: T;
  message: string;
}
async function readEnv<T>(response: Response) {
  return (await response.json()) as Env<T>;
}

test('可注册新账号且邮箱必须唯一', async () => {
  const body = { name: '周测试', email: 'zhou@example.com', password: 'Secure123', agree: true };
  const created = await readEnv<{ email: string }>(
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  expect(created.data.email).toBe('zhou@example.com');
  const duplicated = await readEnv<null>(
    await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  expect(duplicated.code).not.toBe(0);
  expect(duplicated.message).toContain('邮箱');
});

test('新注册账号可立即登录并读取个人身份', async () => {
  await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: '周测试', email: 'zhou@example.com', password: 'Secure123', agree: true }),
  });
  const login = await readEnv<{ token: string }>(
    await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'zhou@example.com', password: 'Secure123' }),
    }),
  );
  expect(login.code).toBe(0);
  const me = await readEnv<{ user: { name: string }; roles: string[] }>(
    await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${login.data.token}` } }),
  );
  expect(me.data).toMatchObject({ user: { name: '周测试' }, roles: ['viewer'] });
});

test('找回密码仅接受已注册邮箱并生成 Mock 重置请求', async () => {
  const existing = await readEnv<{ email: string; expiresInMinutes: number }>(
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'leah@acme.com' }),
    }),
  );
  expect(existing.data).toEqual({ email: 'leah@acme.com', expiresInMinutes: 30 });
  const missing = await readEnv<null>(
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'missing@example.com' }),
    }),
  );
  expect(missing.code).not.toBe(0);
});

test('短信验证码与扫码登录都生成可读取身份的会话', async () => {
  const sent = await readEnv<{ expiresInSeconds: number }>(
    await fetch('/api/auth/sms-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800138000' }),
    }),
  );
  expect(sent.data.expiresInSeconds).toBe(60);

  const sms = await readEnv<{ token: string }>(
    await fetch('/api/auth/sms-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13800138000', code: '123456' }),
    }),
  );
  const qr = await readEnv<{ token: string }>(await fetch('/api/auth/qr-login', { method: 'POST' }));
  expect(sms.data.token).toMatch(/^mock-token-u1-/);
  expect(qr.data.token).toMatch(/^mock-token-u1-/);
});
