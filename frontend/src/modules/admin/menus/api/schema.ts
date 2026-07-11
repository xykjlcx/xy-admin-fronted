import { z } from 'zod';
import type { MenuRecord, Subsystem } from '@/modules/types';

export const LocalizedStringSchema = z.record(z.string(), z.string());
export const RoutePathSchema = z.custom<NonNullable<MenuRecord['path']>>(
  (value) => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//'),
);
export const MenuTypeSchema = z.enum(['dir', 'menu', 'action']);
export const SubsystemSchema = z.object({
  key: z.string(),
  label: LocalizedStringSchema,
  desc: LocalizedStringSchema,
  icon: z.string(),
  color: z.string(),
  home: RoutePathSchema,
  builtin: z.boolean(),
  enabled: z.boolean(),
  sort: z.number(),
}) satisfies z.ZodType<Subsystem>;
export const MenuRecordSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  subsystemKey: z.string(),
  type: MenuTypeSchema,
  label: LocalizedStringSchema,
  icon: z.string().optional(),
  shortLabel: LocalizedStringSchema.optional(),
  path: RoutePathSchema.optional(),
  permission: z.string().optional(),
  visible: z.boolean(),
  sort: z.number(),
  origin: z.enum(['catalog', 'runtime']),
  runtimeManaged: z.boolean(),
}) satisfies z.ZodType<MenuRecord>;

const menuInputBaseShape = {
  label: LocalizedStringSchema,
  icon: z.string().optional(),
  visible: z.boolean(),
  sort: z.number(),
};

const directoryInputShape = {
  ...menuInputBaseShape,
  type: z.literal('dir'),
  parentId: z.null(),
  shortLabel: LocalizedStringSchema.optional(),
  path: z.undefined().optional(),
  permission: z.undefined().optional(),
};

const pageInputShape = {
  ...menuInputBaseShape,
  type: z.literal('menu'),
  parentId: z.string().nullable(),
  shortLabel: LocalizedStringSchema.optional(),
  path: RoutePathSchema,
  permission: z.string().optional(),
};

const actionInputShape = {
  ...menuInputBaseShape,
  type: z.literal('action'),
  parentId: z.string().min(1),
  shortLabel: z.undefined().optional(),
  path: z.undefined().optional(),
  permission: z.string().trim().min(1),
};

export const CreateMenuSchema = z.discriminatedUnion('type', [
  z.object({ ...directoryInputShape, subsystemKey: z.string().min(1) }).strict(),
  z.object({ ...pageInputShape, subsystemKey: z.string().min(1) }).strict(),
  z.object({ ...actionInputShape, subsystemKey: z.string().min(1) }).strict(),
]);

export const RuntimeMenuCreateSchema = z
  .object({ ...directoryInputShape, subsystemKey: z.string().min(1) })
  .strict();

export const UpdateMenuSchema = z.discriminatedUnion('type', [
  z.object(directoryInputShape).strict(),
  z.object(pageInputShape).strict(),
  z.object(actionInputShape).strict(),
]);

export const MenuCustomizationSchema = z
  .object({
    type: MenuTypeSchema,
    parentId: z.string().nullable(),
    label: LocalizedStringSchema,
    icon: z.string().optional(),
    visible: z.boolean(),
    sort: z.number(),
  })
  .strict();
export const SetMenuVisibilitySchema = z.object({ visible: z.boolean() });
export const UpdateSubsystemSchema = SubsystemSchema.pick({
  label: true,
  desc: true,
  icon: true,
  color: true,
  home: true,
  enabled: true,
});
export const CreateSubsystemSchema = UpdateSubsystemSchema.extend({
  key: z.string().trim().regex(/^[a-z][a-z0-9-]*$/),
  builtin: z.boolean(),
  sort: z.number(),
});
export const NullSchema = z.null();

export type ManagedMenuType = z.infer<typeof MenuTypeSchema>;
export type CreateMenuInput = z.infer<typeof CreateMenuSchema>;
export type UpdateMenuInput = z.infer<typeof UpdateMenuSchema>;
export type MenuCustomizationInput = z.infer<typeof MenuCustomizationSchema>;
export type SetMenuVisibilityInput = z.infer<typeof SetMenuVisibilitySchema>;
export type UpdateSubsystemInput = z.infer<typeof UpdateSubsystemSchema>;
export type CreateSubsystemInput = z.infer<typeof CreateSubsystemSchema>;
