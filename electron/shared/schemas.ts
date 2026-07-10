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

const StableSemVerSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:\+[0-9A-Za-z.-]+)?$/);
export const UpdateStatusSchema = z.enum([
  'unsupported',
  'idle',
  'checking',
  'upToDate',
  'available',
  'downloading',
  'downloaded',
  'installing',
  'error',
  'cancelled',
]);
export const UpdateCommandSchema = z.enum(['check', 'download', 'cancelDownload', 'install', 'retry']);
export const UpdateErrorCodeSchema = z.enum([
  'UPDATE_CHECK_FAILED',
  'UPDATE_DOWNLOAD_FAILED',
  'UPDATE_INSTALL_FAILED',
  'INVALID_UPDATE_METADATA',
  'UPDATE_UNKNOWN',
]);
export const UpdateSnapshotSchema = z
  .object({
    status: UpdateStatusSchema,
    currentVersion: StableSemVerSchema,
    operationId: z.uuid().nullable(),
    lastCommand: UpdateCommandSchema.nullable(),
    retryable: z.boolean(),
    targetVersion: StableSemVerSchema.nullable(),
    releaseDate: z.string().datetime().nullable(),
    releaseNotes: z.string().max(20_000).nullable(),
    packageSize: z.number().int().nonnegative().nullable(),
    transferred: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    percent: z.number().min(0).max(100),
    bytesPerSecond: z.number().nonnegative(),
    errorCode: UpdateErrorCodeSchema.nullable(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    const requiresTarget = ['available', 'downloading', 'downloaded', 'installing', 'cancelled'].includes(
      snapshot.status,
    );
    if (requiresTarget && !snapshot.targetVersion) {
      context.addIssue({ code: 'custom', message: '更新状态缺少目标版本', path: ['targetVersion'] });
    }
    if (snapshot.status === 'error' && !snapshot.errorCode) {
      context.addIssue({ code: 'custom', message: '错误状态缺少脱敏错误码', path: ['errorCode'] });
    }
    if (snapshot.status !== 'error' && snapshot.errorCode) {
      context.addIssue({ code: 'custom', message: '非错误状态不能携带错误码', path: ['errorCode'] });
    }
    if (snapshot.transferred > snapshot.total && snapshot.total > 0) {
      context.addIssue({ code: 'custom', message: '更新进度超过总大小', path: ['transferred'] });
    }
  });
export const UpdateCommandInputSchema = z.object({ command: UpdateCommandSchema }).strict();
export const UpdateGetSnapshotInputSchema = z.undefined();
const UpdateCommandDomainErrorSchema = z
  .object({
    code: z.enum(['INVALID_STATE', 'UNSUPPORTED']),
    command: UpdateCommandSchema,
    status: UpdateStatusSchema,
  })
  .strict();
export const UpdateCommandResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), snapshot: UpdateSnapshotSchema }).strict(),
  z.object({ ok: z.literal(false), error: UpdateCommandDomainErrorSchema }).strict(),
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
export type UpdateStatus = z.infer<typeof UpdateStatusSchema>;
export type UpdateCommand = z.infer<typeof UpdateCommandSchema>;
export type UpdateErrorCode = z.infer<typeof UpdateErrorCodeSchema>;
export type UpdateSnapshot = z.infer<typeof UpdateSnapshotSchema>;
export type UpdateCommandInput = z.infer<typeof UpdateCommandInputSchema>;
export type UpdateCommandResult = z.infer<typeof UpdateCommandResultSchema>;
