import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(128),
  email: z.string().email(),
  phone: z.string().trim().max(32),
  company: z.string(),
  department: z.string(),
  role: z.string(),
  location: z.string().trim().min(1).max(200),
  employeeNo: z.string(),
  title: z.string().trim().min(1).max(128),
  joinedAt: z.string(),
  manager: z.string(),
  language: z.string().trim().min(1).max(32),
  timezone: z.string().trim().min(1).max(128),
  bio: z.string().trim().min(1).max(2000),
  emailVerified: z.boolean(),
  lastActive: z.string(),
});
export const UpdateProfileSchema = ProfileSchema.pick({
  name: true,
  phone: true,
  location: true,
  title: true,
  language: true,
  timezone: true,
  bio: true,
});
export const SecuritySettingsSchema = z.object({
  twoFactor: z.boolean(),
  emailAlert: z.boolean(),
  newDeviceAlert: z.boolean(),
});
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
export const PreferenceSchema = z.object({
  language: z.enum(['zh-CN', 'en-US']),
  timezone: z.string().trim().min(1).max(128),
  weeklyDigest: z.boolean(),
  compactNotifications: z.boolean(),
});
export const LoginDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  ip: z.string(),
  lastActive: z.string().nullable(),
  current: z.boolean(),
});
export const NullSchema = z.null();

export type ProfileDto = z.infer<typeof ProfileSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type SecuritySettingsDto = z.infer<typeof SecuritySettingsSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type PreferenceDto = z.infer<typeof PreferenceSchema>;
export type LoginDeviceDto = z.infer<typeof LoginDeviceSchema>;
