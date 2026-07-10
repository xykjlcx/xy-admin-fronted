import { z } from 'zod';

export const ClipboardWriteInputSchema = z.object({ text: z.string().max(1_000_000) }).strict();

export const ExternalOpenInputSchema = z
  .object({ url: z.url() })
  .strict()
  .superRefine(({ url }, context) => {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      (parsed.port && parsed.port !== '443')
    ) {
      context.addIssue({ code: 'custom', message: '外链必须是无凭据、默认端口的 HTTPS URL', path: ['url'] });
    }
  });

export const IpcSuccessSchema = z.object({ ok: z.literal(true) }).strict();
export const CredentialPersistInputSchema = z.object({ token: z.string().min(1).max(16_384) }).strict();
export const CredentialRestoreInputSchema = z.undefined();
export const CredentialClearInputSchema = z
  .object({ reason: z.enum(['logout', 'expired', 'switch-account']) })
  .strict();
export const CredentialRestoreResultSchema = z.object({ token: z.string().max(16_384).nullable() }).strict();

const FileDownloadTaskIdSchema = z.uuid();
const FileDownloadErrorCodeSchema = z.enum([
  'NETWORK_ERROR',
  'HTTP_ERROR',
  'UNSAFE_REDIRECT',
  'UNAPPROVED_ORIGIN',
  'REDIRECT_LOOP',
  'TOO_MANY_REDIRECTS',
  'MISSING_CONTENT_LENGTH',
  'INVALID_CONTENT_LENGTH',
  'CONTENT_LENGTH_MISMATCH',
  'INSUFFICIENT_DISK',
  'FILE_SYSTEM_ERROR',
  'UNKNOWN_ERROR',
]);

export const FileDownloadStartInputSchema = z
  .object({
    resourceId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
    suggestedName: z.string().trim().min(1).max(255),
  })
  .strict();
export const FileDownloadStartResultSchema = z.object({ taskId: FileDownloadTaskIdSchema }).strict();
export const FileDownloadCancelInputSchema = z.object({ taskId: FileDownloadTaskIdSchema }).strict();

const FileDownloadProgressEventSchema = z
  .object({
    taskId: FileDownloadTaskIdSchema,
    status: z.literal('progress'),
    receivedBytes: z.number().int().nonnegative(),
    totalBytes: z.number().int().nonnegative(),
    percent: z.number().int().min(0).max(100),
  })
  .strict()
  .superRefine((event, context) => {
    if (event.receivedBytes > event.totalBytes) {
      context.addIssue({ code: 'custom', message: '下载进度不能超过总长度', path: ['receivedBytes'] });
    }
  });
const FileDownloadCompletedEventSchema = z
  .object({
    taskId: FileDownloadTaskIdSchema,
    status: z.literal('completed'),
    filename: z.string().min(1).max(180),
    bytes: z.number().int().nonnegative(),
  })
  .strict();
const FileDownloadCancelledEventSchema = z
  .object({ taskId: FileDownloadTaskIdSchema, status: z.literal('cancelled') })
  .strict();
const FileDownloadErrorEventSchema = z
  .object({
    taskId: FileDownloadTaskIdSchema,
    status: z.literal('error'),
    code: FileDownloadErrorCodeSchema,
    message: z.string().min(1).max(500),
  })
  .strict();

export const FileDownloadEventSchema = z.discriminatedUnion('status', [
  FileDownloadProgressEventSchema,
  FileDownloadCompletedEventSchema,
  FileDownloadCancelledEventSchema,
  FileDownloadErrorEventSchema,
]);

export type ClipboardWriteInput = z.infer<typeof ClipboardWriteInputSchema>;
export type ExternalOpenInput = z.infer<typeof ExternalOpenInputSchema>;
export type IpcSuccess = z.infer<typeof IpcSuccessSchema>;
export type CredentialClearInput = z.infer<typeof CredentialClearInputSchema>;
export type CredentialRestoreResult = z.infer<typeof CredentialRestoreResultSchema>;
export type FileDownloadStartInput = z.infer<typeof FileDownloadStartInputSchema>;
export type FileDownloadStartResult = z.infer<typeof FileDownloadStartResultSchema>;
export type FileDownloadCancelInput = z.infer<typeof FileDownloadCancelInputSchema>;
export type FileDownloadEvent = z.infer<typeof FileDownloadEventSchema>;
export type FileDownloadErrorCode = z.infer<typeof FileDownloadErrorCodeSchema>;
