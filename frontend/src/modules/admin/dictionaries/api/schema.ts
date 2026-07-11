import { z } from 'zod';

export const DictionarySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  remark: z.string(),
  builtin: z.boolean(),
});

export const DictionaryItemColorSchema = z.enum(['primary', 'success', 'warning', 'danger', 'neutral']);
export const DictionaryItemSchema = z.object({
  id: z.string(),
  dictionaryId: z.string(),
  label: z.string(),
  value: z.string(),
  sort: z.number().int(),
  enabled: z.boolean(),
  color: DictionaryItemColorSchema,
  remark: z.string(),
});

export const CreateDictionarySchema = z.object({
  name: z.string().trim().min(1),
  code: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]*$/),
  remark: z.string().trim(),
  builtin: z.boolean(),
});
export const UpdateDictionarySchema = CreateDictionarySchema.pick({ name: true, remark: true });
export const CreateDictionaryItemSchema = z.object({
  label: z.string().trim().min(1),
  value: z.string().trim().min(1),
  sort: z.number().int(),
  enabled: z.boolean(),
  color: DictionaryItemColorSchema,
  remark: z.string().trim(),
});
export const UpdateDictionaryItemSchema = CreateDictionaryItemSchema;
export const SetDictionaryItemEnabledSchema = z.object({ enabled: z.boolean() });
export const NullSchema = z.null();

export type DictionaryDto = z.infer<typeof DictionarySchema>;
export type DictionaryItemDto = z.infer<typeof DictionaryItemSchema>;
export type CreateDictionaryInput = z.infer<typeof CreateDictionarySchema>;
export type UpdateDictionaryInput = z.infer<typeof UpdateDictionarySchema>;
export type DictionaryItemColor = z.infer<typeof DictionaryItemColorSchema>;
export type CreateDictionaryItemInput = z.infer<typeof CreateDictionaryItemSchema>;
export type UpdateDictionaryItemInput = z.infer<typeof UpdateDictionaryItemSchema>;
export type SetDictionaryItemEnabledInput = z.infer<typeof SetDictionaryItemEnabledSchema>;
