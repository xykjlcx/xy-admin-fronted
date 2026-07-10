import { describe, expect, test } from 'vitest';
import {
  ClipboardWriteInputSchema,
  CredentialClearInputSchema,
  CredentialPersistInputSchema,
  CredentialRestoreResultSchema,
  ExternalOpenInputSchema,
  FileDownloadCancelInputSchema,
  FileDownloadEventSchema,
  FileDownloadStartInputSchema,
  FileDownloadStartResultSchema,
  IpcSuccessSchema,
} from './schemas';

describe('desktop IPC schemas', () => {
  test('accepts bounded clipboard text and a strict success result', () => {
    expect(ClipboardWriteInputSchema.parse({ text: 'tracking-123' })).toEqual({ text: 'tracking-123' });
    expect(IpcSuccessSchema.parse({ ok: true })).toEqual({ ok: true });
    expect(() => ClipboardWriteInputSchema.parse({ text: 'x'.repeat(1_000_001) })).toThrow();
    expect(() => IpcSuccessSchema.parse({ ok: true, leaked: 'payload' })).toThrow();
  });

  test.each([
    'http://docs.example.com',
    'file:///tmp/secret',
    'javascript:alert(1)',
    'https://user:password@docs.example.com',
    'https://docs.example.com:8443',
  ])('rejects an unsafe external URL: %s', (url) => {
    expect(() => ExternalOpenInputSchema.parse({ url })).toThrow();
  });

  test('accepts a credential-free HTTPS URL', () => {
    expect(ExternalOpenInputSchema.parse({ url: 'https://docs.example.com/guide?q=desktop' })).toEqual({
      url: 'https://docs.example.com/guide?q=desktop',
    });
  });

  test('bounds credential IPC and restricts clear reasons', () => {
    expect(CredentialPersistInputSchema.parse({ token: 'token' })).toEqual({ token: 'token' });
    expect(CredentialRestoreResultSchema.parse({ token: null })).toEqual({ token: null });
    expect(CredentialClearInputSchema.parse({ reason: 'expired' })).toEqual({ reason: 'expired' });
    expect(() => CredentialPersistInputSchema.parse({ token: '' })).toThrow();
    expect(() => CredentialPersistInputSchema.parse({ token: 'x'.repeat(16_385) })).toThrow();
    expect(() => CredentialClearInputSchema.parse({ reason: 'other' })).toThrow();
  });

  test('accepts only a restricted file descriptor and opaque task ids', () => {
    const taskId = '9ba560a3-94c6-438a-9d76-1e17627fd483';
    expect(
      FileDownloadStartInputSchema.parse({ resourceId: 'report:2026.07', suggestedName: 'Q2 报告.pdf' }),
    ).toEqual({ resourceId: 'report:2026.07', suggestedName: 'Q2 报告.pdf' });
    expect(FileDownloadStartResultSchema.parse({ taskId })).toEqual({ taskId });
    expect(FileDownloadCancelInputSchema.parse({ taskId })).toEqual({ taskId });

    expect(() =>
      FileDownloadStartInputSchema.parse({
        resourceId: '../secrets',
        suggestedName: 'secret.txt',
        targetPath: '/tmp/secret.txt',
      }),
    ).toThrow();
    expect(() =>
      FileDownloadStartInputSchema.parse({
        resourceId: 'https://evil.example.com/file',
        suggestedName: 'file.txt',
      }),
    ).toThrow();
    expect(() => FileDownloadCancelInputSchema.parse({ taskId: 'predictable-id' })).toThrow();
  });

  test('validates progress, completion, cancellation, and bounded error events', () => {
    const taskId = '9ba560a3-94c6-438a-9d76-1e17627fd483';
    expect(
      FileDownloadEventSchema.parse({
        taskId,
        status: 'progress',
        receivedBytes: 512,
        totalBytes: 1024,
        percent: 50,
      }),
    ).toMatchObject({ status: 'progress', percent: 50 });
    expect(
      FileDownloadEventSchema.parse({
        taskId,
        status: 'completed',
        filename: 'report.pdf',
        bytes: 1024,
      }),
    ).toMatchObject({ status: 'completed', filename: 'report.pdf' });
    expect(FileDownloadEventSchema.parse({ taskId, status: 'cancelled' })).toMatchObject({
      status: 'cancelled',
    });
    expect(
      FileDownloadEventSchema.parse({
        taskId,
        status: 'error',
        code: 'MISSING_CONTENT_LENGTH',
        message: '下载响应缺少 Content-Length',
      }),
    ).toMatchObject({ status: 'error', code: 'MISSING_CONTENT_LENGTH' });

    expect(() =>
      FileDownloadEventSchema.parse({
        taskId,
        status: 'completed',
        filename: 'report.pdf',
        bytes: 1024,
        targetPath: '/Users/example/report.pdf',
      }),
    ).toThrow();
    expect(() =>
      FileDownloadEventSchema.parse({
        taskId,
        status: 'progress',
        receivedBytes: 2048,
        totalBytes: 1024,
        percent: 200,
      }),
    ).toThrow();
  });
});
