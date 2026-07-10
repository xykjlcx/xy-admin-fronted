import { queryClient } from '@/app/query';
import { platform } from '@/lib/platform';
import type { SessionClearReason } from '@/lib/platform/types';
import { useAuth } from '@/stores/auth';

export interface SessionCredentialService {
  restore(): Promise<string | null>;
  replace(token: string): Promise<void>;
  clear(reason: SessionClearReason): Promise<void>;
}

interface SessionCredentialDependencies {
  credentials: {
    restore(): Promise<string | null>;
    persist(token: string): Promise<void>;
    clear(reason: SessionClearReason): Promise<void>;
  };
  auth: {
    getToken(): string | null;
    setToken(token: string | null): void;
  };
  cache: {
    cancel(): Promise<void>;
    clear(): void;
  };
}

export function createSessionCredentialService(
  dependencies: SessionCredentialDependencies,
): SessionCredentialService {
  let restorePromise: Promise<string | null> | null = null;

  return {
    restore() {
      if (restorePromise) return restorePromise;
      restorePromise = (async () => {
        try {
          const token = await dependencies.credentials.restore();
          dependencies.auth.setToken(token);
          return token;
        } catch {
          dependencies.auth.setToken(null);
          return null;
        }
      })();
      return restorePromise;
    },
    async replace(token) {
      await dependencies.credentials.persist(token);
      dependencies.auth.setToken(token);
      try {
        await dependencies.cache.cancel();
      } finally {
        dependencies.cache.clear();
      }
    },
    async clear(reason) {
      dependencies.auth.setToken(null);
      dependencies.cache.clear();
      const results = await Promise.allSettled([
        dependencies.cache.cancel(),
        dependencies.credentials.clear(reason),
      ]);
      const credentialResult = results[1];
      if (credentialResult?.status === 'rejected') throw credentialResult.reason;
      const cacheResult = results[0];
      if (cacheResult?.status === 'rejected') throw cacheResult.reason;
    },
  };
}

export const sessionCredentialService = createSessionCredentialService({
  credentials: platform.credentials,
  auth: {
    getToken: () => useAuth.getState().token,
    setToken: (token) => useAuth.getState().setToken(token),
  },
  cache: {
    cancel: () => queryClient.cancelQueries(),
    clear: () => queryClient.clear(),
  },
});
