import { z } from 'zod';
import { pageResultSchema } from '@/lib/http/contract';

export type PageResult<T> = {
  list: T[];
  total: number;
};

export const UserStatusSchema = z.enum(['active', 'disabled', 'unactivated', 'left']);

export const DeptSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  sort: z.number(),
  memberCount: z.number(),
});

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  deptId: z.string(),
  role: z.string(),
  phone: z.string(),
  email: z.string(),
  status: UserStatusSchema,
  joinedAt: z.string(),
});

// SPEC-QUESTION: 详情扩展字段待后端确认
export const UserDetailSchema = UserSchema.extend({});

export const UsersPageSchema = pageResultSchema(UserSchema);

export const CreateUserSchema = z.object({
  name: z.string().min(1),
  deptId: z.string().min(1),
  role: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
});

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  status: UserStatusSchema.optional(),
});

export const BatchDisableResultSchema = z.object({ updated: z.number() });
export const NullSchema = z.null();

export type UserStatus = z.infer<typeof UserStatusSchema>;
export type DeptDto = z.infer<typeof DeptSchema>;
export type UserDto = z.infer<typeof UserSchema>;
export type UserDetailDto = z.infer<typeof UserDetailSchema>;
export type UsersPageDto = z.infer<typeof UsersPageSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type BatchDisableResult = z.infer<typeof BatchDisableResultSchema>;

export interface UsersQueryParams {
  page: number;
  pageSize: number;
  status: 'all' | UserStatus;
  deptId?: string;
  directOnly?: boolean;
  keyword?: string;
}
