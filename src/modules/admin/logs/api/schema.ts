import { z } from 'zod';

export const OperationTypeSchema = z.enum(['all', 'create', 'edit', 'del', 'export', 'perm', 'config']);
export const OperationLogSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  operator: z.string(),
  type: OperationTypeSchema.exclude(['all']),
  module: z.string(),
  target: z.string(),
  ip: z.string(),
});
export const LoginResultSchema = z.enum(['all', 'ok', 'fail']);
export const LoginLogSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  user: z.string(),
  result: LoginResultSchema.exclude(['all']),
  ip: z.string(),
  location: z.string(),
  device: z.string(),
});
export const OperationLogResultSchema = z.object({
  list: z.array(OperationLogSchema),
  total: z.number().int(),
});
export const LoginLogResultSchema = z.object({ list: z.array(LoginLogSchema), total: z.number().int() });

export type OperationType = z.infer<typeof OperationTypeSchema>;
export type OperationLogDto = z.infer<typeof OperationLogSchema>;
export type LoginResult = z.infer<typeof LoginResultSchema>;
export type LoginLogDto = z.infer<typeof LoginLogSchema>;
