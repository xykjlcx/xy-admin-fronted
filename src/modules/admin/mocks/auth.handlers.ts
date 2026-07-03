import { http, HttpResponse } from 'msw';
import { db } from '@/mocks/db';
import { ok, biz } from '@/mocks/http';

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const { username, password } = (await request.json()) as { username: string; password: string };
    const user = db.users.find((u) => u.username === username && u.password === password);
    if (!user) return biz(4010, '用户名或密码错误');
    const token = `mock-token-${user.id}-${crypto.randomUUID()}`;
    db.sessions.set(token, user.id);
    return ok({ token });
  }),
  http.get('/api/auth/me', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const userId = token && db.sessions.get(token);
    const user = db.users.find((u) => u.id === userId);
    if (!user) return new HttpResponse(null, { status: 401 });
    const { password: _password, ...safe } = user;
    return ok({ user: safe, roles: user.roles, permissions: user.permissions });
  }),
  http.post('/api/auth/logout', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (token) db.sessions.remove(token);
    return ok(null);
  }),
];
