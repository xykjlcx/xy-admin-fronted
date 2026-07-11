import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { profileKeys } from './keys';
import {
  ChangePasswordSchema,
  LoginDeviceSchema,
  NullSchema,
  PreferenceSchema,
  ProfileSchema,
  SecuritySettingsSchema,
  UpdateProfileSchema,
  type ChangePasswordInput,
  type PreferenceDto,
  type SecuritySettingsDto,
  type UpdateProfileInput,
} from './schema';

const profileContract = defineApiContract({ response: ProfileSchema });
const securityContract = defineApiContract({ response: SecuritySettingsSchema });
const preferenceContract = defineApiContract({ response: PreferenceSchema });
const devicesContract = defineApiContract({ response: z.array(LoginDeviceSchema) });
const nullContract = defineApiContract({ response: NullSchema });

export const profileQuery = queryOptions({
  queryKey: profileKeys.detail(),
  staleTime: 5 * 60 * 1000,
  queryFn: ({ signal }) => http.get('/api/profile', undefined, profileContract, { signal }),
});
export const securitySettingsQuery = queryOptions({
  queryKey: profileKeys.security(),
  queryFn: ({ signal }) => http.get('/api/profile/security', undefined, securityContract, { signal }),
});
export const preferenceQuery = queryOptions({
  queryKey: profileKeys.preferences(),
  queryFn: ({ signal }) => http.get('/api/profile/preferences', undefined, preferenceContract, { signal }),
});
export const loginDevicesQuery = queryOptions({
  queryKey: profileKeys.devices(),
  queryFn: ({ signal }) => http.get('/api/profile/devices', undefined, devicesContract, { signal }),
});

export const profileApi = {
  update: (input: UpdateProfileInput) =>
    http.put('/api/profile', UpdateProfileSchema.parse(input), profileContract),
  updateSecurity: (input: SecuritySettingsDto) =>
    http.patch('/api/profile/security', SecuritySettingsSchema.parse(input), securityContract),
  changePassword: (input: ChangePasswordInput) =>
    http.post('/api/profile/password', ChangePasswordSchema.parse(input), nullContract),
  updatePreferences: (input: PreferenceDto) =>
    http.put('/api/profile/preferences', PreferenceSchema.parse(input), preferenceContract),
  removeDevice: (id: string) => http.del(`/api/profile/devices/${id}`, nullContract),
};
