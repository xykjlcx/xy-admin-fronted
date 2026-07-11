import { setupServer } from 'msw/node';
import { resetDb } from '@/mocks/db';
import { profileHandlers } from '@/modules/admin/profile/mocks';
import type { LoginDeviceDto, ProfileDto, SecuritySettingsDto } from '@/modules/admin/profile/api';

const server = setupServer(...profileHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => resetDb());
afterAll(() => server.close());
interface Env<T> {
  code: number;
  data: T;
}
async function readEnv<T>(response: Response) {
  return (await response.json()) as Env<T>;
}

test('个人资料可读取并更新', async () => {
  const initial = await readEnv<ProfileDto>(await fetch('/api/profile'));
  expect(initial.data).toMatchObject({ name: '李长昕', employeeNo: 'E-00142', emailVerified: true });
  const updated = await readEnv<ProfileDto>(
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...initial.data, title: '产品负责人', bio: '专注复杂业务产品。' }),
    }),
  );
  expect(updated.data).toMatchObject({ title: '产品负责人', bio: '专注复杂业务产品。' });
});

test('安全设置可切换且修改密码校验当前密码', async () => {
  const settings = await readEnv<SecuritySettingsDto>(await fetch('/api/profile/security'));
  const updated = await readEnv<SecuritySettingsDto>(
    await fetch('/api/profile/security', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings.data, newDeviceAlert: true }),
    }),
  );
  expect(updated.data.newDeviceAlert).toBe(true);

  const failed = await readEnv<null>(
    await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'newPassword123' }),
    }),
  );
  expect(failed.code).not.toBe(0);
});

test('登录设备可下线但当前设备不可删除', async () => {
  const devices = await readEnv<LoginDeviceDto[]>(await fetch('/api/profile/devices'));
  const other = devices.data.find((device) => !device.current);
  expect(other).toBeDefined();
  const removed = await readEnv<null>(await fetch(`/api/profile/devices/${other?.id}`, { method: 'DELETE' }));
  expect(removed.code).toBe(0);
  const current = devices.data.find((device) => device.current);
  const rejected = await readEnv<null>(
    await fetch(`/api/profile/devices/${current?.id}`, { method: 'DELETE' }),
  );
  expect(rejected.code).not.toBe(0);
});
