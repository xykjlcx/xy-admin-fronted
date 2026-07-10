import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createAtomicCredentialFileStore, createCredentialVault } from './credential-vault';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('credential vault', () => {
  test('decrypts once, keeps an active token, and atomically rotates stale ciphertext', async () => {
    const storage = {
      read: vi.fn().mockResolvedValue(Buffer.from('old-ciphertext')),
      replace: vi.fn().mockResolvedValue(undefined),
    };
    const crypto = {
      isAvailable: vi.fn().mockResolvedValue(true),
      encrypt: vi.fn().mockResolvedValue(Buffer.from('rotated-ciphertext')),
      decrypt: vi.fn().mockResolvedValue({ result: 'session-token', shouldReEncrypt: true }),
    };
    const vault = createCredentialVault({ storage, crypto });

    await expect(Promise.all([vault.restore(), vault.restore()])).resolves.toEqual([
      'session-token',
      'session-token',
    ]);
    expect(crypto.decrypt).toHaveBeenCalledTimes(1);
    expect(crypto.encrypt).toHaveBeenCalledWith('session-token');
    expect(storage.replace).toHaveBeenCalledWith(Buffer.from('rotated-ciphertext'));
    expect(vault.getActiveToken()).toBe('session-token');
  });

  test('persists a replacement before changing the in-memory active token', async () => {
    const storage = { read: vi.fn().mockResolvedValue(null), replace: vi.fn() };
    const crypto = {
      isAvailable: vi.fn().mockResolvedValue(true),
      encrypt: vi.fn().mockResolvedValue(Buffer.from('ciphertext')),
      decrypt: vi.fn(),
    };
    const vault = createCredentialVault({ storage, crypto });
    await vault.restore();
    storage.replace.mockRejectedValueOnce(new Error('disk unavailable'));

    await expect(vault.persist('new-token')).rejects.toThrow('disk unavailable');
    expect(vault.getActiveToken()).toBeNull();
  });

  test('clears active memory before reporting a physical cleanup failure', async () => {
    const storage = { read: vi.fn().mockResolvedValue(null), replace: vi.fn().mockResolvedValue(undefined) };
    const crypto = {
      isAvailable: vi.fn().mockResolvedValue(true),
      encrypt: vi.fn().mockResolvedValue(Buffer.from('ciphertext')),
      decrypt: vi.fn(),
    };
    const vault = createCredentialVault({ storage, crypto });
    await vault.persist('active-token');
    storage.replace.mockRejectedValueOnce(new Error('delete denied'));

    const clearing = vault.clear();
    expect(vault.getActiveToken()).toBeNull();
    await expect(clearing).rejects.toThrow('delete denied');
  });

  test('never falls back to plaintext when async encryption is unavailable', async () => {
    const storage = {
      read: vi.fn().mockResolvedValue(Buffer.from('encrypted')),
      replace: vi.fn(),
    };
    const crypto = {
      isAvailable: vi.fn().mockResolvedValue(false),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    };
    const vault = createCredentialVault({ storage, crypto });

    await expect(vault.restore()).resolves.toBeNull();
    await expect(vault.persist('secret-token')).rejects.toThrow('安全存储不可用');
    expect(storage.replace).not.toHaveBeenCalled();
  });

  test('does not touch the platform keystore when no encrypted credential exists', async () => {
    const storage = { read: vi.fn().mockResolvedValue(null), replace: vi.fn() };
    const crypto = {
      isAvailable: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    };
    const vault = createCredentialVault({ storage, crypto });

    await expect(vault.restore()).resolves.toBeNull();
    expect(crypto.isAvailable).not.toHaveBeenCalled();
    expect(crypto.decrypt).not.toHaveBeenCalled();
  });

  test('atomic file store replaces and removes the credential without leftover temp files', async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'credential-vault-'));
    temporaryDirectories.push(directory);
    const file = path.join(directory, 'credentials', 'session.bin');
    const store = createAtomicCredentialFileStore(file);

    await store.replace(Buffer.from('encrypted'));
    await expect(store.read()).resolves.toEqual(Buffer.from('encrypted'));
    expect(readdirSync(path.dirname(file))).toEqual(['session.bin']);
    await store.replace(null);
    await expect(store.read()).resolves.toBeNull();
  });
});
