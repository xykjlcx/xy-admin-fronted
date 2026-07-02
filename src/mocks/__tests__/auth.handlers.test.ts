import { setupServer } from 'msw/node';
import { authHandlers } from '@/modules/admin/mocks/auth.handlers';

const server = setupServer(...authHandlers);
beforeAll(() => server.listen());
afterAll(() => server.close());

test('登录成功返回 token，me 返回权限集', async () => {
  const login = await (
    await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    })
  ).json();
  expect(login.data.token).toMatch(/^mock-token-/);
  const me = await (
    await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${login.data.token}` } })
  ).json();
  expect(me.data.permissions).toEqual(['*:*:*']);
  expect(me.data.user.password).toBeUndefined();
});

test('密码错误 → code 4010，data 为 null', async () => {
  const res = await (
    await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
    })
  ).json();
  expect(res).toMatchObject({ code: 4010, data: null, message: '用户名或密码错误' });
});

test('无 token 访问 me → 401', async () => {
  const res = await fetch('/api/auth/me');
  expect(res.status).toBe(401);
});
