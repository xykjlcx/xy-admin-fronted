import { z } from 'zod';

export const RoleTypeSchema = z.enum(['system', 'custom']);
export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: RoleTypeSchema,
  desc: z.string(),
  memberDeptId: z.string().optional(),
});
export const CreateRoleSchema = z.object({
  name: z.string().trim().min(1),
  desc: z.string().trim().optional(),
});
export const PermissionActionSchema = z.object({
  id: z.string(),
  label: z.string(),
});
export const PermissionResourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  code: z.string(),
  actions: z.array(PermissionActionSchema),
});
export const PermissionTreeGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  resources: z.array(PermissionResourceSchema),
});
export const RolePermissionMapSchema = z.record(z.string(), z.array(z.string()));
export const RoleMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  deptLabel: z.string(),
  title: z.string(),
});
export const DataScopeSchema = z.enum(['all', 'deptAndChildren', 'dept', 'self', 'custom']);
export const RoleDataPermissionSchema = z.object({
  defaultScope: DataScopeSchema,
  defaultDepartmentIds: z.array(z.string()),
  resources: z.object({}).strict(),
}).strict();
export const RoleAuditLogKindSchema = z.enum(['create', 'edit', 'grant', 'remove', 'dataScope']);
export const RoleAuditLogSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  operator: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  kind: RoleAuditLogKindSchema,
  change: z.string(),
});
export const NullSchema = z.null();

export type RoleType = z.infer<typeof RoleTypeSchema>;
export type RoleDto = z.infer<typeof RoleSchema>;
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type PermissionActionDto = z.infer<typeof PermissionActionSchema>;
export type PermissionResourceDto = z.infer<typeof PermissionResourceSchema>;
export type PermissionTreeGroupDto = z.infer<typeof PermissionTreeGroupSchema>;
export type RolePermissionMap = z.infer<typeof RolePermissionMapSchema>;
export type RoleMemberDto = z.infer<typeof RoleMemberSchema>;
export type DataScope = z.infer<typeof DataScopeSchema>;
export type RoleDataPermission = z.infer<typeof RoleDataPermissionSchema>;
export type RoleAuditLogKind = z.infer<typeof RoleAuditLogKindSchema>;
export type RoleAuditLogDto = z.infer<typeof RoleAuditLogSchema>;
