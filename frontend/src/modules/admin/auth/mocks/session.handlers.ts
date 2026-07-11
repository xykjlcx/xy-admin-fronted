import { http, HttpResponse } from 'msw';
import { db } from '@/mocks/db';
import { ok, biz } from '@/mocks/http';
import { registeredAccounts } from './db';
import { LoginInputSchema, SendSmsCodeSchema, SmsLoginSchema } from '../api/schema';

const loginAliases: Record<string, { password: string; canonical: { username: string; password: string } }> =
  {
    admin: { password: 'admin123', canonical: { username: 'leah@acme.com', password: 'password123' } },
  };

function createSession(userId: string) {
  const token = `mock-token-${userId}-${crypto.randomUUID()}`;
  db.sessions.set(token, userId);
  return token;
}

export const sessionHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const parsed = LoginInputSchema.safeParse(await request.json());
    if (!parsed.success) return biz(4000, '登录参数不完整');
    const { username, password } = parsed.data;
    const alias = loginAliases[username];
    const normalized = alias && password === alias.password ? alias.canonical : { username, password };
    const user = db.users.find(
      (item) => item.username === normalized.username && item.password === normalized.password,
    );
    const registered = registeredAccounts
      .all()
      .find((item) => item.email === normalized.username && item.password === normalized.password);
    const userId = user?.id ?? registered?.id;
    if (!userId) return biz(4010, '用户名或密码错误');
    return ok({ token: createSession(userId) });
  }),
  http.post('/api/auth/sms-code', async ({ request }) => {
    const parsed = SendSmsCodeSchema.safeParse(await request.json());
    if (!parsed.success) return biz(4000, '请输入正确的手机号');
    return ok({ expiresInSeconds: 60 });
  }),
  http.post('/api/auth/sms-login', async ({ request }) => {
    const parsed = SmsLoginSchema.safeParse(await request.json());
    if (!parsed.success || parsed.data.code !== '123456') return biz(4011, '验证码错误或已失效');
    return ok({ token: createSession('u1') });
  }),
  http.post('/api/auth/qr-login', () => {
    return ok({ token: createSession('u1') });
  }),
  http.get('/api/auth/me', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const userId = token && db.sessions.get(token);
    const user = db.users.find((item) => item.id === userId);
    if (user) {
      const { password: _password, ...safe } = user;
      return ok({ user: safe, roles: user.roles, permissions: user.permissions });
    }
    const registered = registeredAccounts.find(userId ?? '');
    if (!registered) return new HttpResponse(null, { status: 401 });
    return ok({
      user: { id: registered.id, name: registered.name, username: registered.email },
      roles: ['viewer'],
      permissions: ['dashboard:overview:view', 'notice:msg:view'],
    });
  }),
  http.post('/api/auth/logout', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (token) db.sessions.remove(token);
    return ok(null);
  }),
];
