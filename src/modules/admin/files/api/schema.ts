import { z } from 'zod';

export const FileKindSchema = z.enum(['folder', 'pdf', 'doc', 'sheet', 'ppt', 'image', 'zip', 'other']);
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
export const FileEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: FileKindSchema,
  mimeType: z.string(),
  size: z.number().int().nullable(),
  owner: z.string(),
  updatedAt: z.string(),
  parentId: z.string().nullable(),
  childCount: z.number().int(),
});
export const FileListResultSchema = z.object({ list: z.array(FileEntrySchema), total: z.number().int() });
export const StorageOverviewSchema = z.object({
  used: z.number(),
  total: z.number(),
  segments: z.array(z.object({ kind: z.enum(['document', 'image', 'video', 'other']), percent: z.number() })),
});
export const CreateFileSchema = z.object({
  name: z.string().trim().min(1),
  mimeType: z.string(),
  size: z.number().int().nonnegative().max(MAX_FILE_SIZE_BYTES),
  parentId: z.string().nullable(),
});
export const CreateFolderSchema = z.object({
  name: z.string().trim().min(1),
  parentId: z.string().nullable(),
});
export const RenameFileSchema = z.object({ name: z.string().trim().min(1) });
export const NullSchema = z.null();

export type FileKind = z.infer<typeof FileKindSchema>;
export type FileEntryDto = z.infer<typeof FileEntrySchema>;
export type CreateFileInput = z.infer<typeof CreateFileSchema>;
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;
export type RenameFileInput = z.infer<typeof RenameFileSchema>;
