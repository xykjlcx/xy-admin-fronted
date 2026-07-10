import { http, bindTokenGetter, type HttpRequestOptions } from '@/lib/http/client';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from '@/stores/auth';
import { defineApiContract } from '@/lib/http/contract';

// token 取值绑定到 auth store（模块副作用，import 即生效）
bindTokenGetter(() => useAuth.getState().token);

// API 文件同时声明请求函数、queryOptions 和响应契约。
// 这样页面只消费稳定的业务查询，不直接拼 URL，也不重复维护 DTO 类型。
const LoginResponseSchema = z.object({ token: z.string() });
const MeSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), username: z.string() }),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});
const NullSchema = z.null();

const loginContract = defineApiContract({ response: LoginResponseSchema });
const meContract = defineApiContract({ response: MeSchema });
const logoutContract = defineApiContract({ response: NullSchema });

export type MeDto = z.infer<typeof MeSchema>;

export const authApi = {
  // on401:'reject'：登录失败的 401（密码错）当业务失败处理，不广播会话过期、不触发全局登出。
  login: (dto: { username: string; password: string }) =>
    http.post('/api/auth/login', dto, loginContract, { on401: 'reject' }),
  me: (options?: HttpRequestOptions) => http.get('/api/auth/me', undefined, meContract, options),
  logout: () => http.post('/api/auth/logout', undefined, logoutContract),
};

export const meQuery = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: ({ signal }) => authApi.me({ signal }),
  staleTime: 5 * 60_000,
});
