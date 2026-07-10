import { setupServer } from 'msw/node';
import { authHandlers } from '@/modules/admin/auth/mocks';
import { authApi, meQuery } from '@/modules/admin/auth/api';
import { queryClient } from '@/app/query';
import { resetSession } from '@/lib/reset-auth';
import { useAuth } from '@/stores/auth';

const server = setupServer(...authHandlers);
beforeAll(() => server.listen());
afterEach(() => {
  queryClient.clear();
  useAuth.setState({ token: null });
});
afterAll(() => server.close());

// 防回归：换账号不串权限。若 resetSession 不清 me 缓存，ensureQueryData 会返回上个账号的缓存。
test('预置 admin me 缓存 → viewer 登录 resetSession → beforeLoad 取到 viewer 权限', async () => {
  queryClient.setQueryData(meQuery.queryKey, {
    user: { id: 'u1', name: '超级管理员', username: 'admin' },
    roles: ['superadmin'],
    permissions: ['*:*:*'],
  });

  const { token } = await authApi.login({ username: 'viewer', password: 'viewer123' });
  await resetSession(token); // 复用登录成功路径的会话切换逻辑

  const me = await queryClient.ensureQueryData(meQuery); // 模拟 _auth beforeLoad
  expect(me.user.username).toBe('viewer');
  expect(me.permissions).toEqual([
    'dashboard:overview:view',
    'iam:user:view',
    'iam:dept:view',
    'notice:msg:view',
  ]);
});

// 防回归：resetSession 必须清空全部业务缓存（不止 ['auth']）。
// 导航（['nav',*] staleTime Infinity）、roles 等不清，换账号后 beforeLoad/Shell 会命中旧账号数据。
test('resetSession 清空所有业务缓存并写入新 token', async () => {
  queryClient.setQueryData(['nav', 'subsystems'], [{ key: 'admin' }]);
  queryClient.setQueryData(['iam', 'roles'], [{ id: 'r1' }]);
  queryClient.setQueryData(meQuery.queryKey, {
    user: { id: 'u1', name: '超级管理员', username: 'admin' },
    roles: ['superadmin'],
    permissions: ['*:*:*'],
  });

  await resetSession('new-token');

  expect(queryClient.getQueryData(['nav', 'subsystems'])).toBeUndefined();
  expect(queryClient.getQueryData(['iam', 'roles'])).toBeUndefined();
  expect(queryClient.getQueryData(meQuery.queryKey)).toBeUndefined();
  expect(useAuth.getState().token).toBe('new-token');
});

// 防回归：在途请求被 cancel，其结果不回填已清空的缓存（避免旧账号数据在 clear 后复活）。
test('resetSession 取消在途请求，被取消的结果不回填缓存', async () => {
  let aborted = false;
  const inflightKey = ['nav', 'menus', 'admin'];
  const inflight = queryClient.fetchQuery({
    queryKey: inflightKey,
    queryFn: ({ signal }) =>
      // 永不自动 resolve，只靠 resetSession 的 cancelQueries 触发 abort
      new Promise<unknown>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          aborted = true;
          reject(new Error('aborted'));
        });
      }),
  });
  inflight.catch(() => {}); // 防未处理 rejection 噪音

  await resetSession(null);

  expect(aborted).toBe(true);
  expect(queryClient.getQueryData(inflightKey)).toBeUndefined();
});
