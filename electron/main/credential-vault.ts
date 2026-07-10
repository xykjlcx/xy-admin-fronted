import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface CredentialCrypto {
  isAvailable(): Promise<boolean>;
  encrypt(plainText: string): Promise<Buffer>;
  decrypt(ciphertext: Buffer): Promise<{ result: string; shouldReEncrypt: boolean }>;
}

interface CredentialStorage {
  read(): Promise<Buffer | null>;
  replace(ciphertext: Buffer | null): Promise<void>;
}

interface CredentialVaultDependencies {
  crypto: CredentialCrypto;
  storage: CredentialStorage;
}

export interface CredentialVault {
  restore(): Promise<string | null>;
  persist(token: string): Promise<void>;
  clear(): Promise<void>;
  getActiveToken(): string | null;
}

export function createAtomicCredentialFileStore(filePath: string): CredentialStorage {
  return {
    async read() {
      try {
        return await readFile(filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    },
    async replace(ciphertext) {
      if (ciphertext === null) {
        try {
          await unlink(filePath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
        return;
      }

      const directory = path.dirname(filePath);
      const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
      await mkdir(directory, { recursive: true, mode: 0o700 });
      try {
        await writeFile(temporaryPath, ciphertext, { flag: 'wx', mode: 0o600 });
        await rename(temporaryPath, filePath);
      } finally {
        await rm(temporaryPath, { force: true });
      }
    },
  };
}

export function createCredentialVault(dependencies: CredentialVaultDependencies): CredentialVault {
  let activeToken: string | null = null;
  let restored = false;
  let restorePromise: Promise<string | null> | null = null;
  let queue = Promise.resolve();
  let generation = 0;

  const runExclusive = <T>(operation: () => Promise<T>): Promise<T> => {
    const current = queue.then(operation, operation);
    queue = current.then(
      () => undefined,
      () => undefined,
    );
    return current;
  };

  const requireEncryption = async (): Promise<void> => {
    if (!(await dependencies.crypto.isAvailable())) throw new Error('安全存储不可用，拒绝明文降级');
  };

  return {
    restore() {
      if (restored) return Promise.resolve(activeToken);
      if (restorePromise) return restorePromise;
      const restoreGeneration = generation;
      restorePromise = runExclusive(async () => {
        try {
          const ciphertext = await dependencies.storage.read();
          if (!ciphertext) {
            restored = true;
            return null;
          }
          if (!(await dependencies.crypto.isAvailable())) {
            restored = true;
            return null;
          }
          const decrypted = await dependencies.crypto.decrypt(ciphertext);
          if (decrypted.shouldReEncrypt) {
            const rotated = await dependencies.crypto.encrypt(decrypted.result);
            await dependencies.storage.replace(rotated);
          }
          if (generation === restoreGeneration) activeToken = decrypted.result;
          restored = true;
          return activeToken;
        } catch (error) {
          activeToken = null;
          restored = true;
          throw error;
        }
      }).finally(() => {
        restorePromise = null;
      });
      return restorePromise;
    },
    persist(token) {
      return runExclusive(async () => {
        await requireEncryption();
        const ciphertext = await dependencies.crypto.encrypt(token);
        await dependencies.storage.replace(ciphertext);
        generation += 1;
        activeToken = token;
        restored = true;
      });
    },
    clear() {
      generation += 1;
      activeToken = null;
      restored = true;
      return runExclusive(() => dependencies.storage.replace(null));
    },
    getActiveToken: () => activeToken,
  };
}
