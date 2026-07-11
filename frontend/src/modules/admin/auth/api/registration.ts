import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import {
  ForgotPasswordResultSchema,
  ForgotPasswordSchema,
  RegisterResultSchema,
  RegisterSchema,
  type ForgotPasswordInput,
  type RegisterInput,
} from './schema';

const registerContract = defineApiContract({ response: RegisterResultSchema });
const forgotContract = defineApiContract({ response: ForgotPasswordResultSchema });
export const registrationApi = {
  register: (input: RegisterInput) =>
    http.post('/api/auth/register', RegisterSchema.parse(input), registerContract),
  forgotPassword: (input: ForgotPasswordInput) =>
    http.post('/api/auth/forgot-password', ForgotPasswordSchema.parse(input), forgotContract),
};
