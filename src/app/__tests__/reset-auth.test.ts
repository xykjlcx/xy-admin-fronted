import { setupServer } from 'msw/node';
import { authHandlers } from '@/modules/admin/mocks/auth.handlers';
import { authApi, meQuery } from '@/modules/admin/api/auth.api';
import { queryClient } from '@/app/query';
import { resetAuth } from '@/lib/reset-auth';
import { useAuth } from '@/stores/auth';

const server = setupServer(...authHandlers);
beforeAll(() => server.listen());
afterEach(() => {
  queryClient.clear();
  useAuth.setState({ token: null });
});
afterAll(() => server.close());

// 防回归：换账号不串权限。若 resetAuth 不清 me 缓存，ensureQueryData 会返回上个账号的缓存。
test('预置 admin me 缓存 → viewer 登录 resetAuth → beforeLoad 取到 viewer 权限', async () => {
  queryClient.setQueryData(meQuery.queryKey, {
    user: { id: 'u1', name: '超级管理员', username: 'admin' },
    roles: ['superadmin'],
    permissions: ['*:*:*'],
  });

  const { token } = await authApi.login({ username: 'viewer', password: 'viewer123' });
  resetAuth(token); // 复用登录成功路径的会话切换逻辑

  const me = await queryClient.ensureQueryData(meQuery); // 模拟 _auth beforeLoad
  expect(me.user.username).toBe('viewer');
  expect(me.permissions).toEqual(['dashboard:view', 'iam:user:view', 'iam:dept:view']);
});
