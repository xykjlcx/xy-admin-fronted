import { http } from 'msw';
import { biz, ok, noContent } from '@/mocks/http';
import { ChangePasswordSchema, PreferenceSchema, SecuritySettingsSchema, UpdateProfileSchema } from '../api';
import { loginDevices, passwords, preferences, profiles, securitySettings } from './db';
import { db } from '@/mocks/db';

function currentProfileId(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  return (token && db.sessions.get(token)) || 'u1';
}

export const profileHandlers = [
  http.get('/api/profile', ({ request }) => ok(profiles.find(currentProfileId(request)))),
  http.put('/api/profile', async ({ request }) => {
    const parsed = UpdateProfileSchema.safeParse(await request.json());
    return parsed.success
      ? ok(profiles.update(currentProfileId(request), parsed.data))
      : biz({ status: 400, code: 'profile.validation.invalid', detail: '个人资料不完整' });
  }),
  http.get('/api/profile/security', () => ok(securitySettings.find('security-u1'))),
  http.patch('/api/profile/security', async ({ request }) => {
    const parsed = SecuritySettingsSchema.safeParse(await request.json());
    return parsed.success
      ? ok(securitySettings.update('security-u1', parsed.data))
      : biz({ status: 400, code: 'profile.security.invalid', detail: '安全设置不合法' });
  }),
  http.post('/api/profile/password', async ({ request }) => {
    const parsed = ChangePasswordSchema.safeParse(await request.json());
    if (!parsed.success) return biz({ status: 400, code: 'profile.password.invalid', detail: '密码格式不正确' });
    if (passwords.find('u1')?.value !== parsed.data.currentPassword) return biz({ status: 400, code: 'profile.password.mismatch', detail: '当前密码错误' });
    passwords.update('u1', { value: parsed.data.newPassword });
    return noContent();
  }),
  http.get('/api/profile/preferences', () => ok(preferences.find('preference-u1'))),
  http.put('/api/profile/preferences', async ({ request }) => {
    const parsed = PreferenceSchema.safeParse(await request.json());
    return parsed.success
      ? ok(preferences.update('preference-u1', parsed.data))
      : biz({ status: 400, code: 'profile.preferences.invalid', detail: '偏好设置不合法' });
  }),
  http.get('/api/profile/devices', () => ok(loginDevices.all())),
  http.delete('/api/profile/devices/:id', ({ params }) => {
    const id = String(params.id);
    const device = loginDevices.find(id);
    if (!device) return biz({ status: 404, code: 'profile.device.not-found', detail: '设备不存在' });
    if (device.current) return biz({ status: 409, code: 'profile.current-device.protected', detail: '当前设备不可下线' });
    loginDevices.remove(id);
    return noContent();
  }),
];

export { loginDevices, preferences, profiles, securitySettings } from './db';
