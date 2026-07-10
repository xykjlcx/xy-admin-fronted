import { describe, expect, test } from 'vitest';
import {
  ClipboardWriteInputSchema,
  CredentialClearInputSchema,
  CredentialPersistInputSchema,
  CredentialRestoreResultSchema,
  ExternalOpenInputSchema,
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
});
