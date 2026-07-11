import { LoginResponseSchema, MeSchema, RefreshResponseSchema } from '../schema';

test('real auth responses retain access and refresh rotation fields', () => {
  expect(LoginResponseSchema.parse({
    token: 'access-1', refreshToken: 'refresh-1', expiresInSeconds: 1800,
  })).toEqual({ token: 'access-1', refreshToken: 'refresh-1', expiresInSeconds: 1800 });
  expect(RefreshResponseSchema.parse({
    token: 'access-2', refreshToken: 'refresh-2', expiresInSeconds: 1800,
  }).token).toBe('access-2');
});

test('/me exposes snapshot security semantics without weakening existing fields', () => {
  expect(MeSchema.parse({
    user: { id: '01900000-0000-7000-8000-000000000010', name: 'Administrator', username: 'admin' },
    roles: ['SYSTEM_ADMIN'], permissions: ['iam:user:view'], systemAdmin: true,
    dataScope: { unrestricted: true, self: false, deptIds: [] },
  }).systemAdmin).toBe(true);
});

test('/me rejects responses missing snapshot security semantics', () => {
  expect(() => MeSchema.parse({
    user: { id: 'u1', name: 'User', username: 'user' }, roles: [], permissions: [],
  })).toThrow();
});
