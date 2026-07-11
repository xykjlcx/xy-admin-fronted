import { http, bindTokenGetter, type HttpRequestOptions } from '@/lib/http/client';
import { queryOptions } from '@tanstack/react-query';
import { useAuth } from '@/stores/auth';
import { defineApiContract, defineVoidContract } from '@/lib/http/contract';
import { authKeys } from './keys';
import {
  LoginInputSchema,
  LoginResponseSchema,
  MeSchema,
  SendSmsCodeResultSchema,
  SendSmsCodeSchema,
  SmsLoginSchema,
  type LoginInput,
  type SendSmsCodeInput,
  type SmsLoginInput,
} from './schema';

// token 取值绑定到 auth store（模块副作用，import 即生效）
bindTokenGetter(() => useAuth.getState().token);

// API 文件同时声明请求函数、queryOptions 和响应契约。
// 这样页面只消费稳定的业务查询，不直接拼 URL，也不重复维护 DTO 类型。
const loginContract = defineApiContract({ response: LoginResponseSchema });
const sendSmsCodeContract = defineApiContract({ response: SendSmsCodeResultSchema });
const meContract = defineApiContract({ response: MeSchema });
const logoutContract = defineVoidContract();

export type { MeDto } from './schema';

export const authApi = {
  // on401:'reject'：登录失败的 401（密码错）当业务失败处理，不广播会话过期、不触发全局登出。
  login: (dto: LoginInput) =>
    http.post('/api/auth/login', LoginInputSchema.parse(dto), loginContract, { on401: 'reject' }),
  sendSmsCode: (dto: SendSmsCodeInput) =>
    http.post('/api/auth/sms-code', SendSmsCodeSchema.parse(dto), sendSmsCodeContract),
  smsLogin: (dto: SmsLoginInput) =>
    http.post('/api/auth/sms-login', SmsLoginSchema.parse(dto), loginContract, { on401: 'reject' }),
  qrLogin: () => http.post('/api/auth/qr-login', undefined, loginContract, { on401: 'reject' }),
  me: (options?: HttpRequestOptions) => http.get('/api/auth/me', undefined, meContract, options),
  logout: () => http.post('/api/auth/logout', undefined, logoutContract),
};

export const meQuery = queryOptions({
  queryKey: authKeys.me(),
  queryFn: ({ signal }) => authApi.me({ signal }),
  staleTime: 5 * 60_000,
});
