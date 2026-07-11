import { LoginDeviceSchema, PreferenceSchema, ProfileSchema, UpdateProfileSchema } from '../schema';

test('电话号码缺失使用空字符串语义且资料仍可解析和保存', () => {
  const profile = ProfileSchema.parse({
    id: '01900000-0000-7000-8000-000000000010', name: 'Administrator', email: 'admin@example.test',
    phone: '', company: 'MetaBuilder', department: 'Platform', role: 'Admin', location: 'Shanghai',
    employeeNo: 'E-1', title: 'Administrator', joinedAt: '2026-01-01', manager: '', language: 'zh-CN',
    timezone: 'Asia/Shanghai', bio: 'Profile', emailVerified: true, lastActive: '2026-01-01T00:00:00Z',
  });
  expect(profile.phone).toBe('');
  expect(UpdateProfileSchema.parse({ name: 'Administrator', phone: '', location: 'Shanghai', title: 'Administrator', language: 'zh-CN', timezone: 'Asia/Shanghai', bio: 'Profile' }).phone).toBe('');
});

it('rejects preference timezone wider than the V10 column', () => {
  expect(PreferenceSchema.safeParse({ language: 'zh-CN', timezone: 'x'.repeat(129), weeklyDigest: true, compactNotifications: false }).success).toBe(false);
});

it('keeps profile activity required but accepts unknown device activity', () => {
  expect(() => ProfileSchema.parse({
    id: '1', name: 'Administrator', email: 'a@example.com', phone: '', company: '', department: '', role: '',
    location: 'Shanghai', employeeNo: '', title: 'Administrator', joinedAt: '', manager: '', language: 'zh-CN',
    timezone: 'Asia/Shanghai', bio: 'Profile', emailVerified: true, lastActive: null,
  })).toThrow();
  expect(LoginDeviceSchema.parse({ id: 'device', name: 'Chrome', location: 'Unknown', ip: 'Unknown', lastActive: null, current: false }).lastActive).toBeNull();
});
