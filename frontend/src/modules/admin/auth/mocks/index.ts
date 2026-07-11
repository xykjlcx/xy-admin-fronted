import { http } from 'msw';
import { biz, ok } from '@/mocks/http';
import { genId } from '@/mocks/db';
import { ForgotPasswordSchema, RegisterSchema } from '../api';
import { passwordResetRequests, registeredAccounts } from './db';
import { profiles } from '@/modules/admin/profile/mocks';
import { sessionHandlers } from './session.handlers';

export const registrationHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const parsed = RegisterSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'auth.registration.invalid', detail: '注册信息不完整' });
    if (registeredAccounts.all().some((account) => account.email === parsed.data.email))
      return biz({ status: 409, code: 'auth.email.conflict', detail: '邮箱已注册' });
    const account = registeredAccounts.insert({
      id: genId('registered-user'),
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    });
    profiles.insert({
      id: account.id,
      name: account.name,
      email: account.email,
      phone: '待完善',
      company: '个人空间',
      department: '待分配',
      role: '只读成员',
      location: '待完善',
      employeeNo: '待分配',
      title: '待完善',
      joinedAt: '2026-07-10',
      manager: '待分配',
      language: '中文',
      timezone: 'Asia/Shanghai (GMT+8)',
      bio: '这个人很低调，还没有填写个人简介。',
      emailVerified: false,
      lastActive: '刚刚',
    });
    return ok({ email: parsed.data.email });
  }),
  http.post('/api/auth/forgot-password', async ({ request }) => {
    const parsed = ForgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'auth.email.invalid', detail: '邮箱格式不正确' });
    if (!registeredAccounts.all().some((account) => account.email === parsed.data.email))
      return biz({ status: 404, code: 'auth.email.not-found', detail: '邮箱未注册' });
    passwordResetRequests.insert({
      id: genId('password-reset'),
      email: parsed.data.email,
      createdAt: '2026-07-10 16:00:00',
    });
    return ok({ email: parsed.data.email, expiresInMinutes: 30 });
  }),
];

export const authHandlers = [...sessionHandlers, ...registrationHandlers];

export { passwordResetRequests, registeredAccounts } from './db';
