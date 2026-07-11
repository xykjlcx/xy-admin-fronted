import { setupServer } from 'msw/node';
import { authHandlers } from '@/modules/admin/auth/mocks';
import { authApi, meQuery } from '@/modules/admin/auth/api';
import { queryClient } from '@/app/query';
import { resetSession } from '@/lib/reset-auth';
import { useAuth } from '@/stores/auth';
import { http as mswHttp, HttpResponse } from 'msw';
import {
  bindAuthRefreshHandler,
  http as request,
} from '@/lib/http/client';
import { authEvents } from '@/lib/http/events';
import { AuthExpiredError } from '@/lib/http/errors';
import { defineApiContract } from '@/lib/http/contract';
import { z } from 'zod';

const server = setupServer(...authHandlers);
beforeAll(() => server.listen());
afterEach(() => {
  queryClient.clear();
  useAuth.setState({ token: null });
  bindAuthRefreshHandler(null);
  server.resetHandlers();
});
afterAll(() => server.close());

// 防回归：换账号不串权限。若 resetSession 不清 me 缓存，ensureQueryData 会返回上个账号的缓存。
test('预置 admin me 缓存 → viewer 登录 resetSession → beforeLoad 取到 viewer 权限', async () => {
  // Task 10 批量迁移 handler 前，本集成测试局部使用 Task 9 的 direct JSON 方言。
  server.use(
    mswHttp.post('/api/auth/login', () => HttpResponse.json({
      token: 'viewer-token', refreshToken: 'viewer-refresh', expiresInSeconds: 1800,
    })),
    mswHttp.get('/api/auth/me', () =>
      HttpResponse.json({
        user: { id: 'u2', name: '查看者', username: 'viewer' },
        roles: ['viewer'],
        permissions: [
          'dashboard:overview:view',
          'iam:user:view',
          'iam:dept:view',
          'notice:msg:view',
        ],
        systemAdmin: false,
        dataScope: { unrestricted: false, self: true, deptIds: [] },
      }),
    ),
  );
  queryClient.setQueryData(meQuery.queryKey, {
    user: { id: 'u1', name: '超级管理员', username: 'admin' },
    roles: ['superadmin'],
    permissions: ['*:*:*'],
    systemAdmin: true,
    dataScope: { unrestricted: true, self: false, deptIds: [] },
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
    systemAdmin: true,
    dataScope: { unrestricted: true, self: false, deptIds: [] },
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

test('resetSession explicitly advances auth epoch even when a token value is reused', async () => {
  const contract = defineApiContract({ response: z.object({ id: z.number() }) });
  let refreshCalls = 0;
  let expiryEvents = 0;
  const off = authEvents.on('expired', () => {
    expiryEvents += 1;
  });
  bindAuthRefreshHandler({
    refresh: async () => {
      refreshCalls += 1;
      throw new Error('refresh denied');
    },
    commitToken: (token) => useAuth.getState().setToken(token),
  });
  server.use(
    mswHttp.get('/api/auth-epoch-probe', () =>
      HttpResponse.json(
        { status: 401, code: 'auth.token.expired', detail: 'expired' },
        { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    ),
  );

  await resetSession('old-token');
  await expect(request.get('/api/auth-epoch-probe', undefined, contract)).rejects.toBeInstanceOf(
    AuthExpiredError,
  );
  await resetSession(null);
  await resetSession('old-token');
  await expect(request.get('/api/auth-epoch-probe', undefined, contract)).rejects.toBeInstanceOf(
    AuthExpiredError,
  );

  expect(refreshCalls).toBe(2);
  expect(expiryEvents).toBe(2);
  off();
});

test('resetSession aborts an old refresh flight and stale resolution cannot overwrite the new session', async () => {
  const contract = defineApiContract({ response: z.object({ id: z.number() }) });
  let refreshSignal: AbortSignal | undefined;
  let releaseRefresh: () => void = () => undefined;
  let commitCalls = 0;
  let expiryEvents = 0;
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  const off = authEvents.on('expired', () => {
    expiryEvents += 1;
  });
  bindAuthRefreshHandler({
    refresh: async (signal: AbortSignal) => {
      refreshSignal = signal;
      await refreshGate;
      return 'stale-refresh-token';
    },
    commitToken: (token: string) => {
      commitCalls += 1;
      useAuth.getState().setToken(token);
    },
  });
  server.use(
    mswHttp.get('/api/stale-refresh-probe', () =>
      HttpResponse.json(
        { status: 401, code: 'auth.token.expired', detail: 'expired' },
        { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    ),
  );

  await resetSession('old-session-token');
  const oldRequest = request
    .get('/api/stale-refresh-probe', undefined, contract)
    .catch((error: unknown) => error);
  await vi.waitFor(() => expect(refreshSignal).toBeInstanceOf(AbortSignal));

  await resetSession('new-session-token');
  expect(refreshSignal?.aborted).toBe(true);
  releaseRefresh();
  await oldRequest;
  await Promise.resolve();

  expect(useAuth.getState().token).toBe('new-session-token');
  expect(commitCalls).toBe(0);
  expect(expiryEvents).toBe(0);
  off();
});
