import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  agree: z.literal(true),
});
export const RegisterResultSchema = z.object({ email: z.string().email() });
export const ForgotPasswordSchema = z.object({ email: z.string().trim().email() });
export const ForgotPasswordResultSchema = z.object({
  email: z.string().email(),
  expiresInMinutes: z.number().int().positive(),
});
export const LoginInputSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });
export const LoginResponseSchema = z.object({ token: z.string() });
export const PhoneSchema = z.string().trim().regex(/^1\d{10}$/);
export const SendSmsCodeSchema = z.object({ phone: PhoneSchema });
export const SendSmsCodeResultSchema = z.object({ expiresInSeconds: z.number().int().positive() });
export const SmsLoginSchema = z.object({ phone: PhoneSchema, code: z.string().trim().length(6) });
export const MeSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), username: z.string() }),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
});
export const NullSchema = z.null();

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type SendSmsCodeInput = z.infer<typeof SendSmsCodeSchema>;
export type SmsLoginInput = z.infer<typeof SmsLoginSchema>;
export type MeDto = z.infer<typeof MeSchema>;
